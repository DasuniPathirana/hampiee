using Hampiee.Application.Services;
using Hampiee.Domain.Entities;
using Hampiee.Domain.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hampiee.API.Controllers;

[ApiController]
[Route("api/products")]
public class ProductsController : ControllerBase
{
    private readonly IProductRepository _products;
    private readonly ICategoryRepository _categories;
    private readonly IStorageService _storage;
    private readonly ICacheService _cache;
    private readonly ILogger<ProductsController> _logger;

    public ProductsController(IProductRepository products, ICategoryRepository categories,
        IStorageService storage, ICacheService cache, ILogger<ProductsController> logger)
    {
        _products = products;
        _categories = categories;
        _storage = storage;
        _cache = cache;
        _logger = logger;
    }

    /// <summary>Get all active products (paginated, filtered)</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? q, [FromQuery] Guid? categoryId,
        [FromQuery] decimal? minPrice, [FromQuery] decimal? maxPrice,
        [FromQuery] bool? inStock, [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        [FromQuery] string sortBy = "newest", CancellationToken ct = default)
    {
        var cacheKey = $"products:{q}:{categoryId}:{minPrice}:{maxPrice}:{inStock}:{page}:{pageSize}:{sortBy}";
        var cached = await _cache.GetAsync<ProductListResponse>(cacheKey, ct);
        if (cached != null) return Ok(cached);

        var (items, total) = await _products.SearchAsync(q, categoryId, minPrice, maxPrice, inStock, page, pageSize, sortBy, ct);
        var response = new ProductListResponse(
            items.Select(MapToSummary),
            total, page, pageSize,
            (int)Math.Ceiling((double)total / pageSize));

        await _cache.SetAsync(cacheKey, response, TimeSpan.FromMinutes(5), ct);
        return Ok(response);
    }

    /// <summary>Get single product by slug</summary>
    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBySlug(string slug, CancellationToken ct)
    {
        var cacheKey = $"product:{slug}";
        var cached = await _cache.GetAsync<ProductDetailResponse>(cacheKey, ct);
        if (cached != null) return Ok(cached);

        var product = await _products.GetBySlugAsync(slug, ct);
        if (product == null) return NotFound();

        var response = MapToDetail(product);
        await _cache.SetAsync(cacheKey, response, TimeSpan.FromMinutes(10), ct);
        return Ok(response);
    }

    /// <summary>Get featured products</summary>
    [HttpGet("featured")]
    public async Task<IActionResult> GetFeatured([FromQuery] int count = 8, CancellationToken ct = default)
    {
        var products = await _products.GetFeaturedAsync(count, ct);
        return Ok(products.Select(MapToSummary));
    }

    // ─── Admin Endpoints ───────────────────────────────────────────────────────

    /// <summary>Create new product (Admin)</summary>
    [HttpPost]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> Create([FromBody] CreateProductRequest req, CancellationToken ct)
    {
        var product = Product.Create(req.Name, req.Slug, req.ShortDescription, req.Description,
            req.Price, req.StockQuantity, req.CategoryId, req.Sku);
        product.UpdateDetails(req.Name, req.Slug, req.ShortDescription, req.Description,
            req.Price, req.CompareAtPrice, req.Brand, req.Sku, req.WeightGrams, req.CategoryId);

        await _products.AddAsync(product, ct);
        await _products.SaveChangesAsync(ct);
        await _cache.RemoveByPatternAsync("products:*", ct);

        _logger.LogInformation("Product created: {ProductId} - {Name}", product.Id, product.Name);
        return CreatedAtAction(nameof(GetBySlug), new { slug = product.Slug }, MapToDetail(product));
    }

    /// <summary>Update product (Admin)</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateProductRequest req, CancellationToken ct)
    {
        var product = await _products.GetByIdAsync(id, ct);
        if (product == null) return NotFound();

        product.UpdateDetails(req.Name, req.Slug, req.ShortDescription, req.Description,
            req.Price, req.CompareAtPrice, req.Brand, req.Sku, req.WeightGrams, req.CategoryId);
        _products.Update(product);
        await _products.SaveChangesAsync(ct);
        await _cache.RemoveByPatternAsync("product:*", ct);
        await _cache.RemoveByPatternAsync("products:*", ct);

        return Ok(MapToDetail(product));
    }

    /// <summary>Upload product images (Admin)</summary>
    [HttpPost("{id:guid}/images")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> UploadImages(Guid id, IFormFileCollection files, CancellationToken ct)
    {
        var product = await _products.GetByIdAsync(id, ct);
        if (product == null) return NotFound();

        var uploadedUrls = new List<string>();
        var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp" };
        const long maxSize = 5 * 1024 * 1024; // 5MB

        foreach (var (file, index) in files.Select((f, i) => (f, i)))
        {
            if (!allowedTypes.Contains(file.ContentType))
                return BadRequest(new { message = $"File {file.FileName}: only JPEG, PNG, WebP allowed" });
            if (file.Length > maxSize)
                return BadRequest(new { message = $"File {file.FileName}: max size is 5MB" });

            using var stream = file.OpenReadStream();
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            var fileName = $"{id}/{Guid.NewGuid()}{ext}";
            var url = await _storage.UploadAsync(stream, fileName, file.ContentType, "products", ct);
            product.AddImage(url, product.Name, index);
            uploadedUrls.Add(url);
        }

        _products.Update(product);
        await _products.SaveChangesAsync(ct);
        await _cache.RemoveByPatternAsync($"product:{product.Slug}", ct);

        return Ok(new { urls = uploadedUrls });
    }

    /// <summary>Update stock quantity (Admin)</summary>
    [HttpPatch("{id:guid}/stock")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> UpdateStock(Guid id, [FromBody] UpdateStockRequest req, CancellationToken ct)
    {
        var product = await _products.GetByIdAsync(id, ct);
        if (product == null) return NotFound();

        product.AdjustStock(req.Delta);
        _products.Update(product);
        await _products.SaveChangesAsync(ct);

        return Ok(new { stockQuantity = product.StockQuantity });
    }

    /// <summary>Delete product (soft delete) (Admin)</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var product = await _products.GetByIdAsync(id, ct);
        if (product == null) return NotFound();

        product.SoftDelete();
        _products.Update(product);
        await _products.SaveChangesAsync(ct);
        await _cache.RemoveByPatternAsync("product:*", ct);
        await _cache.RemoveByPatternAsync("products:*", ct);

        return NoContent();
    }

    // ─── Mapping ───────────────────────────────────────────────────────────────

    private static ProductSummaryResponse MapToSummary(Product p) => new(
        p.Id, p.Name, p.Slug, p.ShortDescription, p.Price, p.CompareAtPrice,
        p.Images.OrderBy(i => i.DisplayOrder).FirstOrDefault()?.Url,
        p.HasStock, p.IsFeatured, p.IsOnSale, p.DiscountPercentage);

    private static ProductDetailResponse MapToDetail(Product p) => new(
        p.Id, p.Name, p.Slug, p.ShortDescription, p.Description,
        p.Price, p.CompareAtPrice, p.StockQuantity, p.Brand, p.Sku, p.WeightGrams,
        p.Images.OrderBy(i => i.DisplayOrder).Select(i => new ImageDto(i.Url, i.AltText, i.DisplayOrder)),
        p.Tags.Select(t => t.Tag),
        p.CategoryId, p.IsActive, p.IsFeatured, p.HasStock, p.IsOnSale, p.DiscountPercentage,
        p.CreatedAt);
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

public record ProductListResponse(
    IEnumerable<ProductSummaryResponse> Items,
    int TotalCount, int Page, int PageSize, int TotalPages);

public record ProductSummaryResponse(
    Guid Id, string Name, string Slug, string ShortDescription,
    decimal Price, decimal? CompareAtPrice, string? PrimaryImageUrl,
    bool HasStock, bool IsFeatured, bool IsOnSale, decimal? DiscountPercentage);

public record ProductDetailResponse(
    Guid Id, string Name, string Slug, string ShortDescription, string Description,
    decimal Price, decimal? CompareAtPrice, int StockQuantity,
    string? Brand, string? Sku, decimal WeightGrams,
    IEnumerable<ImageDto> Images, IEnumerable<string> Tags,
    Guid? CategoryId, bool IsActive, bool IsFeatured,
    bool HasStock, bool IsOnSale, decimal? DiscountPercentage, DateTime CreatedAt);

public record ImageDto(string Url, string AltText, int DisplayOrder);

public record CreateProductRequest(
    string Name, string Slug, string ShortDescription, string Description,
    decimal Price, decimal? CompareAtPrice, int StockQuantity,
    string? Brand, string? Sku, decimal WeightGrams, Guid? CategoryId);

public record UpdateStockRequest(int Delta);
