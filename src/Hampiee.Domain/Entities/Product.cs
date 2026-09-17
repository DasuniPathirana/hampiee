using Hampiee.Domain.Enums;
using Hampiee.Domain.Events;

namespace Hampiee.Domain.Entities;

/// <summary>Individual sellable item (tea, chocolates, candle, etc.)</summary>
public class Product : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public string Slug { get; private set; } = string.Empty;
    public string ShortDescription { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public decimal Price { get; private set; }
    public decimal? CompareAtPrice { get; private set; }
    public int StockQuantity { get; private set; }
    public bool IsActive { get; private set; } = true;
    public bool IsFeatured { get; private set; }
    public bool TrackInventory { get; private set; } = true;
    public string? Brand { get; private set; }
    public string? Sku { get; private set; }
    public decimal WeightGrams { get; private set; }
    public Guid? CategoryId { get; private set; }
    public Category? Category { get; private set; }

    private readonly List<ProductImage> _images = [];
    public IReadOnlyCollection<ProductImage> Images => _images.AsReadOnly();

    private readonly List<ProductTag> _tags = [];
    public IReadOnlyCollection<ProductTag> Tags => _tags.AsReadOnly();

    private readonly List<HamperItem> _hamperItems = [];
    public IReadOnlyCollection<HamperItem> HamperItems => _hamperItems.AsReadOnly();

    private Product() { }

    public static Product Create(
        string name,
        string slug,
        string shortDescription,
        string description,
        decimal price,
        int stockQuantity,
        Guid? categoryId = null,
        string? sku = null)
    {
        var product = new Product
        {
            Name = name,
            Slug = slug,
            ShortDescription = shortDescription,
            Description = description,
            Price = price,
            StockQuantity = stockQuantity,
            CategoryId = categoryId,
            Sku = sku
        };
        product.AddDomainEvent(new ProductCreatedEvent(product.Id, product.Name));
        return product;
    }

    public void UpdateDetails(string name, string slug, string shortDescription, string description,
        decimal price, decimal? compareAtPrice, string? brand, string? sku, decimal weightGrams, Guid? categoryId)
    {
        Name = name;
        Slug = slug;
        ShortDescription = shortDescription;
        Description = description;
        Price = price;
        CompareAtPrice = compareAtPrice;
        Brand = brand;
        Sku = sku;
        WeightGrams = weightGrams;
        CategoryId = categoryId;
        MarkUpdated();
    }

    public void AdjustStock(int delta)
    {
        var newQty = StockQuantity + delta;
        if (newQty < 0) throw new InvalidOperationException($"Insufficient stock for product {Id}");
        StockQuantity = newQty;
        if (StockQuantity == 0) AddDomainEvent(new ProductOutOfStockEvent(Id, Name));
        MarkUpdated();
    }

    public void AddImage(string url, string altText, int displayOrder) =>
        _images.Add(new ProductImage { ProductId = Id, Url = url, AltText = altText, DisplayOrder = displayOrder });

    public void SetFeatured(bool featured) { IsFeatured = featured; MarkUpdated(); }
    public void Activate() { IsActive = true; MarkUpdated(); }
    public void Deactivate() { IsActive = false; MarkUpdated(); }

    public bool HasStock => !TrackInventory || StockQuantity > 0;
    public bool IsOnSale => CompareAtPrice.HasValue && CompareAtPrice > Price;
    public decimal? DiscountPercentage => IsOnSale
        ? Math.Round((CompareAtPrice!.Value - Price) / CompareAtPrice.Value * 100, 0)
        : null;
}

public class ProductImage
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid ProductId { get; init; }
    public string Url { get; init; } = string.Empty;
    public string AltText { get; init; } = string.Empty;
    public int DisplayOrder { get; init; }
    public bool IsPrimary => DisplayOrder == 0;
}

public class ProductTag
{
    public Guid ProductId { get; init; }
    public string Tag { get; init; } = string.Empty;
}
