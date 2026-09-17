namespace Hampiee.Domain.Entities;

/// <summary>Pre-built or customizable gift hamper (basket of products)</summary>
public class Hamper : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public string Slug { get; private set; } = string.Empty;
    public string ShortDescription { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public string? HeroImageUrl { get; private set; }
    public bool IsCustomizable { get; private set; }
    public bool IsActive { get; private set; } = true;
    public bool IsFeatured { get; private set; }
    public decimal? OverridePrice { get; private set; }
    public Guid? CategoryId { get; private set; }
    public Category? Category { get; private set; }

    private readonly List<HamperItem> _items = [];
    public IReadOnlyCollection<HamperItem> Items => _items.AsReadOnly();

    private readonly List<HamperImage> _images = [];
    public IReadOnlyCollection<HamperImage> Images => _images.AsReadOnly();

    private Hamper() { }

    public static Hamper Create(
        string name, string slug, string description, string shortDescription,
        bool isCustomizable = false, Guid? categoryId = null)
        => new()
        {
            Name = name,
            Slug = slug,
            Description = description,
            ShortDescription = shortDescription,
            IsCustomizable = isCustomizable,
            CategoryId = categoryId
        };

    public void AddItem(Guid productId, int quantity, bool isSwappable = false)
    {
        var existing = _items.FirstOrDefault(i => i.ProductId == productId);
        if (existing != null)
        {
            _items.Remove(existing);
            _items.Add(existing with { Quantity = existing.Quantity + quantity });
        }
        else
        {
            _items.Add(new HamperItem { HamperId = Id, ProductId = productId, Quantity = quantity, IsSwappable = isSwappable });
        }
        MarkUpdated();
    }

    public void RemoveItem(Guid productId)
    {
        var item = _items.FirstOrDefault(i => i.ProductId == productId);
        if (item != null) { _items.Remove(item); MarkUpdated(); }
    }

    /// <summary>Calculated price = sum of product prices unless overridden</summary>
    public decimal CalculatedPrice(IEnumerable<(Guid ProductId, decimal Price)> productPrices)
    {
        if (OverridePrice.HasValue) return OverridePrice.Value;
        var priceMap = productPrices.ToDictionary(p => p.ProductId, p => p.Price);
        return _items.Sum(i => priceMap.TryGetValue(i.ProductId, out var p) ? p * i.Quantity : 0);
    }

    public void SetOverridePrice(decimal? price) { OverridePrice = price; MarkUpdated(); }
    public void AddImage(string url, string altText, int order) =>
        _images.Add(new HamperImage { HamperId = Id, Url = url, AltText = altText, DisplayOrder = order });

    public void Activate() { IsActive = true; MarkUpdated(); }
    public void Deactivate() { IsActive = false; MarkUpdated(); }
    public void SetFeatured(bool featured) { IsFeatured = featured; MarkUpdated(); }
}

public record HamperItem
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid HamperId { get; init; }
    public Guid ProductId { get; init; }
    public Product? Product { get; init; }
    public int Quantity { get; init; }
    public bool IsSwappable { get; init; }
}

public class HamperImage
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid HamperId { get; init; }
    public string Url { get; init; } = string.Empty;
    public string AltText { get; init; } = string.Empty;
    public int DisplayOrder { get; init; }
}
