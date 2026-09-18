using Hampiee.Domain.Entities;
using Hampiee.Domain.Repositories;
using Hampiee.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Hampiee.API.Controllers;

[ApiController]
[Route("api/hampers")]
public class HampersController : ControllerBase
{
    private readonly IHamperRepository _hampers;
    private readonly ICacheService _cache;

    public HampersController(IHamperRepository hampers, ICacheService cache)
    {
        _hampers = hampers;
        _cache = cache;
    }

    [HttpGet("featured")]
    public async Task<IActionResult> GetFeatured([FromQuery] int count = 8, CancellationToken ct = default)
    {
        var cacheKey = $"hampers:featured:{count}";
        var cached = await _cache.GetAsync<IEnumerable<object>>(cacheKey, ct);
        if (cached != null) return Ok(cached);

        var items = await _hampers.GetFeaturedAsync(count, ct);
        var result = items.Select(MapToResponse);
        await _cache.SetAsync(cacheKey, result, TimeSpan.FromMinutes(10), ct);
        return Ok(result);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? categoryId, [FromQuery] decimal? minPrice,
        [FromQuery] decimal? maxPrice, [FromQuery] int page = 1, [FromQuery] int pageSize = 12,
        CancellationToken ct = default)
    {
        Guid? catId = Guid.TryParse(categoryId, out var g) ? g : null;
        var (items, total) = await _hampers.GetPagedAsync(catId, minPrice, maxPrice, page, pageSize, ct);
        return Ok(new
        {
            items = items.Select(MapToResponse),
            totalCount = total, page, pageSize,
            totalPages = (int)Math.Ceiling((double)total / pageSize)
        });
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> Get(string slug, CancellationToken ct = default)
    {
        var hamper = await _hampers.GetBySlugAsync(slug, ct);
        if (hamper == null) return NotFound();
        return Ok(MapToDetailResponse(hamper));
    }

    [HttpPost]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> Create([FromBody] HamperRequest req, CancellationToken ct = default)
    {
        var hamper = Hamper.Create(req.Name, req.Slug, req.ShortDescription);
        hamper.Update(req.Name, req.Slug, req.ShortDescription, req.Description,
            req.HeroImageUrl, req.OverridePrice, req.CategoryId, req.IsCustomizable,
            req.IsFeatured, req.DisplayOrder);

        await _hampers.AddAsync(hamper, ct);
        await _hampers.SaveChangesAsync(ct);
        await _cache.RemoveByPatternAsync("hampers:*", ct);
        return CreatedAtAction(nameof(Get), new { slug = hamper.Slug }, MapToResponse(hamper));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] HamperRequest req, CancellationToken ct = default)
    {
        var hamper = await _hampers.GetByIdAsync(id, ct);
        if (hamper == null) return NotFound();

        hamper.Update(req.Name, req.Slug, req.ShortDescription, req.Description,
            req.HeroImageUrl, req.OverridePrice, req.CategoryId, req.IsCustomizable,
            req.IsFeatured, req.DisplayOrder);

        _hampers.Update(hamper);
        await _hampers.SaveChangesAsync(ct);
        await _cache.RemoveByPatternAsync("hampers:*", ct);
        return Ok(MapToResponse(hamper));
    }

    private static object MapToResponse(Hamper h) => new
    {
        h.Id, h.Name, h.Slug, h.ShortDescription, h.HeroImageUrl,
        Price = h.CalculatedPrice([]),
        h.CompareAtPrice, h.IsCustomizable, h.IsFeatured, h.CategoryId,
        Images = h.Images.Select(i => new { i.Url, i.AltText })
    };

    private static object MapToDetailResponse(Hamper h) => new
    {
        h.Id, h.Name, h.Slug, h.ShortDescription, h.Description, h.HeroImageUrl,
        Price = h.CalculatedPrice([]),
        h.CompareAtPrice, h.IsCustomizable, h.IsFeatured, h.CategoryId,
        Images = h.Images.Select(i => new { i.Url, i.AltText }),
        Items = h.Items.Select(i => new { i.ProductId, i.Quantity, i.IsSwappable })
    };
}

public record HamperRequest(
    string Name, string Slug, string ShortDescription, string? Description,
    string? HeroImageUrl, decimal? OverridePrice, Guid? CategoryId,
    bool IsCustomizable, bool IsFeatured, int DisplayOrder);

// ─── Categories Controller ──────────────────────────────────────────────────

[ApiController]
[Route("api/categories")]
public class CategoriesController : ControllerBase
{
    private readonly ICategoryRepository _categories;
    private readonly ICacheService _cache;

    public CategoriesController(ICategoryRepository categories, ICacheService cache)
    {
        _categories = categories;
        _cache = cache;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct = default)
    {
        var cached = await _cache.GetAsync<IEnumerable<object>>("categories:all", ct);
        if (cached != null) return Ok(cached);

        var cats = await _categories.GetWithChildrenAsync(ct);
        var result = cats.Select(c => new
        {
            c.Id, c.Name, c.Slug, c.Description, c.ImageUrl, c.Icon,
            c.OccasionTag, c.DisplayOrder,
            Children = c.Children.Select(ch => new { ch.Id, ch.Name, ch.Slug, ch.Icon })
        });
        await _cache.SetAsync("categories:all", result, TimeSpan.FromHours(1), ct);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Create([FromBody] CategoryRequest req, CancellationToken ct = default)
    {
        var cat = Category.Create(req.Name, req.Slug, req.ParentId);
        await _categories.AddAsync(cat, ct);
        await _categories.SaveChangesAsync(ct);
        await _cache.RemoveAsync("categories:all", ct);
        return CreatedAtAction(null, new { slug = cat.Slug }, cat);
    }
}

public record CategoryRequest(string Name, string Slug, Guid? ParentId);

// ICacheService reference (already defined in CmsController.cs, using partial pattern here)
// Note: This uses the interface from Application.Services namespace
