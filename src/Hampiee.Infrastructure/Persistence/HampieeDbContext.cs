using Hampiee.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Hampiee.Infrastructure.Persistence;

public class ApplicationUser : IdentityUser<Guid>
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Role { get; set; } = "Customer";
    public Guid? CustomerId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string FullName => $"{FirstName} {LastName}";
}

public class HampieeDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
{
    public HampieeDbContext(DbContextOptions<HampieeDbContext> options) : base(options) { }

    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();
    public DbSet<ProductTag> ProductTags => Set<ProductTag>();
    public DbSet<Hamper> Hampers => Set<Hamper>();
    public DbSet<HamperItem> HamperItems => Set<HamperItem>();
    public DbSet<HamperImage> HamperImages => Set<HamperImage>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<OrderStatusHistory> OrderStatusHistories => Set<OrderStatusHistory>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Address> Addresses => Set<Address>();
    public DbSet<WishlistItem> WishlistItems => Set<WishlistItem>();
    public DbSet<DeliveryZone> DeliveryZones => Set<DeliveryZone>();
    public DbSet<DeliverySlot> DeliverySlots => Set<DeliverySlot>();
    public DbSet<Promotion> Promotions => Set<Promotion>();
    public DbSet<CmsBlock> CmsBlocks => Set<CmsBlock>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Rename Identity tables
        builder.Entity<ApplicationUser>().ToTable("users");
        builder.Entity<IdentityRole<Guid>>().ToTable("roles");
        builder.Entity<IdentityUserRole<Guid>>().ToTable("user_roles");
        builder.Entity<IdentityUserClaim<Guid>>().ToTable("user_claims");
        builder.Entity<IdentityUserLogin<Guid>>().ToTable("user_logins");
        builder.Entity<IdentityRoleClaim<Guid>>().ToTable("role_claims");
        builder.Entity<IdentityUserToken<Guid>>().ToTable("user_tokens");

        // Product
        builder.Entity<Product>(e =>
        {
            e.ToTable("products");
            e.HasKey(p => p.Id);
            e.Property(p => p.Price).HasPrecision(18, 2);
            e.Property(p => p.CompareAtPrice).HasPrecision(18, 2);
            e.HasMany(p => p.Images).WithOne().HasForeignKey(i => i.ProductId);
            e.HasMany(p => p.Tags).WithOne().HasForeignKey(t => t.ProductId);
            e.HasIndex(p => p.Slug).IsUnique();
            e.HasQueryFilter(p => !p.IsDeleted);
        });

        builder.Entity<ProductImage>().ToTable("product_images");
        builder.Entity<ProductTag>().ToTable("product_tags")
            .HasKey(t => new { t.ProductId, t.Tag });

        // Hamper
        builder.Entity<Hamper>(e =>
        {
            e.ToTable("hampers");
            e.HasKey(h => h.Id);
            e.Property(h => h.OverridePrice).HasPrecision(18, 2);
            e.HasMany(h => h.Items).WithOne().HasForeignKey(i => i.HamperId);
            e.HasMany(h => h.Images).WithOne().HasForeignKey(i => i.HamperId);
            e.HasIndex(h => h.Slug).IsUnique();
            e.HasQueryFilter(h => !h.IsDeleted);
        });

        builder.Entity<HamperItem>().ToTable("hamper_items");
        builder.Entity<HamperImage>().ToTable("hamper_images");

        // Category
        builder.Entity<Category>(e =>
        {
            e.ToTable("categories");
            e.HasIndex(c => c.Slug).IsUnique();
            e.HasMany(c => c.Children).WithOne(c => c.Parent).HasForeignKey(c => c.ParentId);
            e.HasQueryFilter(c => !c.IsDeleted);
        });

        // Order
        builder.Entity<Order>(e =>
        {
            e.ToTable("orders");
            e.HasKey(o => o.Id);
            e.Property(o => o.SubTotal).HasPrecision(18, 2);
            e.Property(o => o.DeliveryFee).HasPrecision(18, 2);
            e.Property(o => o.DiscountAmount).HasPrecision(18, 2);
            e.Property(o => o.Total).HasPrecision(18, 2);
            e.OwnsOne(o => o.DeliveryAddress, a =>
            {
                a.Property(p => p.Line1).HasColumnName("delivery_line1");
                a.Property(p => p.Line2).HasColumnName("delivery_line2");
                a.Property(p => p.City).HasColumnName("delivery_city");
                a.Property(p => p.District).HasColumnName("delivery_district");
                a.Property(p => p.PostalCode).HasColumnName("delivery_postal_code");
                a.Property(p => p.RecipientName).HasColumnName("recipient_name");
                a.Property(p => p.RecipientPhone).HasColumnName("recipient_phone");
            });
            e.HasMany(o => o.Items).WithOne().HasForeignKey(i => i.OrderId);
            e.HasMany(o => o.StatusHistory).WithOne().HasForeignKey(h => h.OrderId);
            e.HasIndex(o => o.OrderNumber).IsUnique();
        });

        builder.Entity<OrderItem>(e =>
        {
            e.ToTable("order_items");
            e.Property(i => i.UnitPrice).HasPrecision(18, 2);
            e.Property(i => i.CustomItems)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<CustomHamperLine>>(v, (JsonSerializerOptions?)null));
        });

        builder.Entity<OrderStatusHistory>().ToTable("order_status_history");

        // Customer
        builder.Entity<Customer>(e =>
        {
            e.ToTable("customers");
            e.HasMany(c => c.Addresses).WithOne().HasForeignKey(a => a.CustomerId);
            e.HasMany(c => c.Wishlist).WithOne().HasForeignKey(w => w.CustomerId);
            e.HasIndex(c => c.Email).IsUnique();
            e.HasQueryFilter(c => !c.IsDeleted);
        });

        builder.Entity<Address>().ToTable("addresses");
        builder.Entity<WishlistItem>().ToTable("wishlist_items");

        // Delivery
        builder.Entity<DeliveryZone>(e =>
        {
            e.ToTable("delivery_zones");
            e.Property(z => z.BasePrice).HasPrecision(18, 2);
            e.Property(z => z.FreeDeliveryThreshold).HasPrecision(18, 2);
            e.Property(z => z.Districts)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<string[]>(v, (JsonSerializerOptions?)null) ?? Array.Empty<string>());
            e.HasMany(z => z.AvailableSlots).WithOne().HasForeignKey(s => s.ZoneId);
            e.HasQueryFilter(z => !z.IsDeleted);
        });

        builder.Entity<DeliverySlot>().ToTable("delivery_slots");

        // Promotion
        builder.Entity<Promotion>(e =>
        {
            e.ToTable("promotions");
            e.Property(p => p.Value).HasPrecision(18, 2);
            e.Property(p => p.MinimumOrderAmount).HasPrecision(18, 2);
            e.HasIndex(p => p.Code).IsUnique();
            e.HasQueryFilter(p => !p.IsDeleted);
        });

        // CMS
        builder.Entity<CmsBlock>(e =>
        {
            e.ToTable("cms_blocks");
            e.HasIndex(b => b.Key).IsUnique();
            e.HasQueryFilter(b => !b.IsDeleted);
        });
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Dispatch domain events before saving
        var entitiesWithEvents = ChangeTracker.Entries<BaseEntity>()
            .Where(e => e.Entity.DomainEvents.Any())
            .Select(e => e.Entity)
            .ToList();

        var result = await base.SaveChangesAsync(cancellationToken);

        // Clear events after save (event dispatcher handled by MediatR pipeline)
        foreach (var entity in entitiesWithEvents)
            entity.ClearDomainEvents();

        return result;
    }
}
