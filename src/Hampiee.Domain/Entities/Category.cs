namespace Hampiee.Domain.Entities;

/// <summary>Product/Hamper category — supports nested hierarchy</summary>
public class Category : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public string Slug { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public string? ImageUrl { get; private set; }
    public Guid? ParentId { get; private set; }
    public Category? Parent { get; private set; }
    public int DisplayOrder { get; private set; }
    public bool IsActive { get; private set; } = true;
    public string? Icon { get; private set; } // Material icon name or emoji
    public string? OccasionTag { get; private set; } // Birthday, Wedding, Avurudu, Corporate...

    private readonly List<Category> _children = [];
    public IReadOnlyCollection<Category> Children => _children.AsReadOnly();

    private Category() { }

    public static Category Create(string name, string slug, Guid? parentId = null, string? occasionTag = null)
        => new()
        {
            Name = name,
            Slug = slug,
            ParentId = parentId,
            OccasionTag = occasionTag
        };

    public void Update(string name, string slug, string? description, string? imageUrl,
        string? icon, string? occasionTag, int displayOrder)
    {
        Name = name;
        Slug = slug;
        Description = description;
        ImageUrl = imageUrl;
        Icon = icon;
        OccasionTag = occasionTag;
        DisplayOrder = displayOrder;
        MarkUpdated();
    }

    public void Activate() { IsActive = true; MarkUpdated(); }
    public void Deactivate() { IsActive = false; MarkUpdated(); }
}
