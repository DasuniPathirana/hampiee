using Hampiee.Domain.Entities;
using Hampiee.Domain.Enums;
using Hampiee.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Hampiee.Infrastructure.Persistence;

/// <summary>Seeds essential data into an empty database on first run</summary>
public static class DatabaseSeeder
{
    public static async Task SeedAsync(HampieeDbContext db, ILogger logger)
    {
        try
        {
            await db.Database.MigrateAsync();

            // Seed categories if empty
            if (!await db.Set<Category>().AnyAsync())
            {
                await SeedCategoriesAsync(db);
                logger.LogInformation("Categories seeded");
            }

            // Seed delivery zones if empty
            if (!await db.Set<DeliveryZone>().AnyAsync())
            {
                await SeedDeliveryZonesAsync(db);
                logger.LogInformation("Delivery zones seeded");
            }

            // Seed CMS blocks if empty
            if (!await db.Set<CmsBlock>().AnyAsync())
            {
                await SeedCmsBlocksAsync(db);
                logger.LogInformation("CMS blocks seeded");
            }

            await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to seed database");
        }
    }

    private static async Task SeedCategoriesAsync(HampieeDbContext db)
    {
        var categories = new[]
        {
            CreateCategory("Birthday Gifts", "birthday", "🎂", "Birthday"),
            CreateCategory("Wedding & Anniversary", "wedding", "💍", "Wedding"),
            CreateCategory("Corporate Hampers", "corporate", "💼", "Corporate"),
            CreateCategory("Avurudu Collection", "avurudu", "🌺", "Avurudu"),
            CreateCategory("Baby & New Arrival", "baby", "👶", "Baby"),
            CreateCategory("Thank You Gifts", "thank-you", "🙏", "ThankYou"),
            CreateCategory("Sympathy & Condolence", "sympathy", "🕊️", "Sympathy"),
            CreateCategory("Tea Collections", "tea", "🍵", null),
            CreateCategory("Chocolate & Sweets", "chocolates", "🍫", null),
            CreateCategory("Spa & Wellness", "wellness", "🧴", null),
            CreateCategory("Gourmet Food", "gourmet", "🧀", null),
            CreateCategory("Luxury Hampers", "luxury", "✨", null),
        };

        await db.Set<Category>().AddRangeAsync(categories);
    }

    private static Category CreateCategory(string name, string slug, string icon, string? occasion)
    {
        var cat = Category.Create(name, slug, null);
        // Use reflection or direct property setting
        typeof(Category).GetProperty("Icon")?.SetValue(cat, icon);
        typeof(Category).GetProperty("OccasionTag")?.SetValue(cat, occasion);
        typeof(Category).GetProperty("IsActive")?.SetValue(cat, true);
        return cat;
    }

    private static async Task SeedDeliveryZonesAsync(HampieeDbContext db)
    {
        var zones = new[]
        {
            new DeliveryZoneData(
                "Greater Colombo",
                ["Colombo", "Gampaha", "Kalutara"],
                299m, 10000m, "Same Day / Next Day", true
            ),
            new DeliveryZoneData(
                "Central Province",
                ["Kandy", "Matale", "Nuwara Eliya"],
                499m, 15000m, "1-2 Days", false
            ),
            new DeliveryZoneData(
                "Southern Province",
                ["Galle", "Matara", "Hambantota"],
                499m, 15000m, "1-2 Days", false
            ),
            new DeliveryZoneData(
                "North Western Province",
                ["Kurunegala", "Puttalam"],
                499m, 15000m, "1-2 Days", false
            ),
            new DeliveryZoneData(
                "Sabaragamuwa Province",
                ["Ratnapura", "Kegalle"],
                599m, 15000m, "2-3 Days", false
            ),
            new DeliveryZoneData(
                "Eastern Province",
                ["Batticaloa", "Ampara", "Trincomalee"],
                699m, 20000m, "2-3 Days", false
            ),
            new DeliveryZoneData(
                "North Central Province",
                ["Anuradhapura", "Polonnaruwa"],
                699m, 20000m, "2-3 Days", false
            ),
            new DeliveryZoneData(
                "Uva Province",
                ["Badulla", "Moneragala"],
                699m, 20000m, "2-3 Days", false
            ),
            new DeliveryZoneData(
                "Northern Province",
                ["Jaffna", "Kilinochchi", "Mannar", "Vavuniya", "Mullaitivu"],
                799m, 25000m, "3-4 Days", false
            ),
        };

        var entities = zones.Select((z, i) => {
            var zone = DeliveryZone.Create(z.Name, z.Districts, z.BasePrice, z.IsSameDay);
            typeof(DeliveryZone).GetProperty("FreeDeliveryThreshold")?.SetValue(zone, z.FreeThreshold);
            typeof(DeliveryZone).GetProperty("EstimatedDelivery")?.SetValue(zone, z.EstimatedDelivery);
            typeof(DeliveryZone).GetProperty("DisplayOrder")?.SetValue(zone, i);
            return zone;
        }).ToList();

        await db.Set<DeliveryZone>().AddRangeAsync(entities);
    }

    private static async Task SeedCmsBlocksAsync(HampieeDbContext db)
    {
        var blocks = new[]
        {
            CmsBlock.Create("hero-banner", "Gift with Soul, Gift with Lanka", 0),
            CmsBlock.Create("promo-strip", "🚚 Free delivery on orders over LKR 10,000 · Island-Wide Delivery", 0),
            CmsBlock.Create("about-section", "Our Story", 0),
            CmsBlock.Create("occasion-banner-birthday", "Birthday Hampers", 0),
            CmsBlock.Create("occasion-banner-corporate", "Corporate Gifting", 0),
        };

        // Update each block with initial content
        blocks[0].Update(
            "Gift with Soul, Gift with Lanka",
            "Curated hampers from the finest Sri Lankan treasures",
            null, null, null, null, "/collections", "Shop Now",
            "#1A1A2E", "#FFFFFF", 0, null);

        foreach (var b in blocks) b.Activate();
        await db.Set<CmsBlock>().AddRangeAsync(blocks);
    }

    private record DeliveryZoneData(string Name, string[] Districts, decimal BasePrice, decimal FreeThreshold, string EstimatedDelivery, bool IsSameDay);
}
