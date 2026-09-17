namespace Hampiee.Domain.Entities;

/// <summary>Admin-configurable CMS content blocks (banners, homepage sections, etc.)</summary>
public class CmsBlock : BaseEntity
{
    public string Key { get; private set; } = string.Empty; // Unique identifier e.g. "hero-banner", "occasion-strip"
    public string Title { get; private set; } = string.Empty;
    public string? Subtitle { get; private set; }
    public string? Body { get; private set; }
    public string? ImageUrl { get; private set; }
    public string? MobileImageUrl { get; private set; }
    public string? VideoUrl { get; private set; }
    public string? LinkUrl { get; private set; }
    public string? LinkText { get; private set; }
    public string? BackgroundColor { get; private set; }
    public string? TextColor { get; private set; }
    public int DisplayOrder { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime? ScheduleFrom { get; private set; }
    public DateTime? ScheduleTo { get; private set; }
    public string? MetaJson { get; private set; } // Extra data as JSON for flexibility

    private CmsBlock() { }

    public static CmsBlock Create(string key, string title, int displayOrder = 0)
        => new() { Key = key, Title = title, DisplayOrder = displayOrder };

    public void Update(string title, string? subtitle, string? body, string? imageUrl,
        string? mobileImageUrl, string? videoUrl, string? linkUrl, string? linkText,
        string? bgColor, string? textColor, int displayOrder, string? metaJson)
    {
        Title = title;
        Subtitle = subtitle;
        Body = body;
        ImageUrl = imageUrl;
        MobileImageUrl = mobileImageUrl;
        VideoUrl = videoUrl;
        LinkUrl = linkUrl;
        LinkText = linkText;
        BackgroundColor = bgColor;
        TextColor = textColor;
        DisplayOrder = displayOrder;
        MetaJson = metaJson;
        MarkUpdated();
    }

    public void Schedule(DateTime? from, DateTime? to) { ScheduleFrom = from; ScheduleTo = to; MarkUpdated(); }
    public void Activate() { IsActive = true; MarkUpdated(); }
    public void Deactivate() { IsActive = false; MarkUpdated(); }

    public bool IsCurrentlyActive =>
        IsActive &&
        (!ScheduleFrom.HasValue || DateTime.UtcNow >= ScheduleFrom.Value) &&
        (!ScheduleTo.HasValue || DateTime.UtcNow <= ScheduleTo.Value);
}
