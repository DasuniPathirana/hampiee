using Hampiee.Domain.Entities;
using Hampiee.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Hampiee.Infrastructure.Persistence.Repositories;

/// <summary>Generic EF Core repository base</summary>
public class Repository<T> : IRepository<T> where T : BaseEntity
{
    protected readonly HampieeDbContext _db;
    protected readonly DbSet<T> _set;

    public Repository(HampieeDbContext db)
    {
        _db = db;
        _set = db.Set<T>();
    }

    public virtual async Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _set.FindAsync([id], ct);

    public virtual async Task<IEnumerable<T>> GetAllAsync(CancellationToken ct = default)
        => await _set.AsNoTracking().ToListAsync(ct);

    public virtual async Task AddAsync(T entity, CancellationToken ct = default)
        => await _set.AddAsync(entity, ct);

    public virtual void Update(T entity) => _set.Update(entity);

    public virtual void Delete(T entity) => entity.SoftDelete();

    public virtual async Task<int> SaveChangesAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);
}

// ── Product Repository ────────────────────────────────────────────────────────
public class ProductRepository : Repository<Product>, IProductRepository
{
    public ProductRepository(HampieeDbContext db) : base(db) { }

    public async Task<Product?> GetBySlugAsync(string slug, CancellationToken ct = default)
        => await _set.Include(p => p.Images).Include(p => p.Tags)
                     .FirstOrDefaultAsync(p => p.Slug == slug, ct);

    public async Task<IEnumerable<Product>> GetByCategoryAsync(Guid categoryId, CancellationToken ct = default)
        => await _set.Where(p => p.CategoryId == categoryId && p.IsActive)
                     .Include(p => p.Images).AsNoTracking().ToListAsync(ct);

    public async Task<IEnumerable<Product>> GetFeaturedAsync(int count = 8, CancellationToken ct = default)
        => await _set.Where(p => p.IsFeatured && p.IsActive)
                     .Include(p => p.Images).OrderByDescending(p => p.CreatedAt)
                     .Take(count).AsNoTracking().ToListAsync(ct);

    public async Task<(IEnumerable<Product> Items, int TotalCount)> SearchAsync(
        string? query, Guid? categoryId, decimal? minPrice, decimal? maxPrice,
        bool? inStock, int page, int pageSize, string sortBy, CancellationToken ct = default)
    {
        var q = _set.Include(p => p.Images).Where(p => p.IsActive).AsQueryable();

        if (!string.IsNullOrWhiteSpace(query))
            q = q.Where(p => p.Name.Contains(query) || p.Description.Contains(query) || p.ShortDescription.Contains(query));
        if (categoryId.HasValue)
            q = q.Where(p => p.CategoryId == categoryId);
        if (minPrice.HasValue)
            q = q.Where(p => p.Price >= minPrice.Value);
        if (maxPrice.HasValue)
            q = q.Where(p => p.Price <= maxPrice.Value);
        if (inStock.HasValue)
            q = q.Where(p => inStock.Value ? p.StockQuantity > 0 : p.StockQuantity == 0);

        var total = await q.CountAsync(ct);

        q = sortBy switch
        {
            "price-asc"  => q.OrderBy(p => p.Price),
            "price-desc" => q.OrderByDescending(p => p.Price),
            "name"       => q.OrderBy(p => p.Name),
            "featured"   => q.OrderByDescending(p => p.IsFeatured).ThenByDescending(p => p.CreatedAt),
            _            => q.OrderByDescending(p => p.CreatedAt) // "newest"
        };

        var items = await q.Skip((page - 1) * pageSize).Take(pageSize).AsNoTracking().ToListAsync(ct);
        return (items, total);
    }
}

// ── Hamper Repository ─────────────────────────────────────────────────────────
public class HamperRepository : Repository<Hamper>, IHamperRepository
{
    public HamperRepository(HampieeDbContext db) : base(db) { }

    public async Task<Hamper?> GetBySlugAsync(string slug, CancellationToken ct = default)
        => await _set.Include(h => h.Items).Include(h => h.Images)
                     .FirstOrDefaultAsync(h => h.Slug == slug, ct);

    public async Task<IEnumerable<Hamper>> GetFeaturedAsync(int count = 8, CancellationToken ct = default)
        => await _set.Where(h => h.IsFeatured && h.IsActive)
                     .Include(h => h.Images).OrderByDescending(h => h.CreatedAt)
                     .Take(count).AsNoTracking().ToListAsync(ct);

    public async Task<(IEnumerable<Hamper> Items, int TotalCount)> GetPagedAsync(
        Guid? categoryId, decimal? minPrice, decimal? maxPrice, int page, int pageSize, CancellationToken ct = default)
    {
        var q = _set.Include(h => h.Images).Where(h => h.IsActive).AsQueryable();
        if (categoryId.HasValue) q = q.Where(h => h.CategoryId == categoryId);
        if (minPrice.HasValue) q = q.Where(h => h.OverridePrice >= minPrice || h.OverridePrice == null);
        if (maxPrice.HasValue) q = q.Where(h => h.OverridePrice <= maxPrice || h.OverridePrice == null);
        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(h => h.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).AsNoTracking().ToListAsync(ct);
        return (items, total);
    }
}

// ── Order Repository ──────────────────────────────────────────────────────────
public class OrderRepository : Repository<Order>, IOrderRepository
{
    public OrderRepository(HampieeDbContext db) : base(db) { }

    public async Task<Order?> GetByOrderNumberAsync(string orderNumber, CancellationToken ct = default)
        => await _set.Include(o => o.Items).Include(o => o.StatusHistory)
                     .FirstOrDefaultAsync(o => o.OrderNumber == orderNumber, ct);

    public async Task<IEnumerable<Order>> GetByCustomerAsync(Guid customerId, CancellationToken ct = default)
        => await _set.Where(o => o.CustomerId == customerId)
                     .Include(o => o.Items).OrderByDescending(o => o.CreatedAt)
                     .AsNoTracking().ToListAsync(ct);

    public async Task<(IEnumerable<Order> Items, int TotalCount)> GetPagedAsync(
        string? status, string? search, DateOnly? from, DateOnly? to, int page, int pageSize, CancellationToken ct = default)
    {
        var q = _set.Include(o => o.Items).AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(o => o.Status.ToString() == status);
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(o => o.OrderNumber.Contains(search) || o.CustomerEmail.Contains(search) || o.CustomerName.Contains(search));
        if (from.HasValue)
            q = q.Where(o => DateOnly.FromDateTime(o.CreatedAt) >= from.Value);
        if (to.HasValue)
            q = q.Where(o => DateOnly.FromDateTime(o.CreatedAt) <= to.Value);
        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(o => o.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).AsNoTracking().ToListAsync(ct);
        return (items, total);
    }
}

// ── Customer Repository ───────────────────────────────────────────────────────
public class CustomerRepository : Repository<Customer>, ICustomerRepository
{
    public CustomerRepository(HampieeDbContext db) : base(db) { }

    public async Task<Customer?> GetByEmailAsync(string email, CancellationToken ct = default)
        => await _set.Include(c => c.Addresses).FirstOrDefaultAsync(c => c.Email == email, ct);

    public async Task<(IEnumerable<Customer> Items, int TotalCount)> GetPagedAsync(
        string? search, int page, int pageSize, CancellationToken ct = default)
    {
        var q = _set.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(c => c.Email.Contains(search) || c.FirstName.Contains(search) || c.LastName.Contains(search));
        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(c => c.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).AsNoTracking().ToListAsync(ct);
        return (items, total);
    }
}

// ── Category Repository ───────────────────────────────────────────────────────
public class CategoryRepository : Repository<Category>, ICategoryRepository
{
    public CategoryRepository(HampieeDbContext db) : base(db) { }

    public async Task<Category?> GetBySlugAsync(string slug, CancellationToken ct = default)
        => await _set.Include(c => c.Children).FirstOrDefaultAsync(c => c.Slug == slug, ct);

    public async Task<IEnumerable<Category>> GetTopLevelAsync(CancellationToken ct = default)
        => await _set.Where(c => c.ParentId == null && c.IsActive).OrderBy(c => c.DisplayOrder).AsNoTracking().ToListAsync(ct);

    public async Task<IEnumerable<Category>> GetWithChildrenAsync(CancellationToken ct = default)
        => await _set.Where(c => c.ParentId == null && c.IsActive).Include(c => c.Children).OrderBy(c => c.DisplayOrder).AsNoTracking().ToListAsync(ct);
}

// ── Promotion Repository ──────────────────────────────────────────────────────
public class PromotionRepository : Repository<Promotion>, IPromotionRepository
{
    public PromotionRepository(HampieeDbContext db) : base(db) { }

    public async Task<Promotion?> GetByCodeAsync(string code, CancellationToken ct = default)
        => await _set.FirstOrDefaultAsync(p => p.Code == code.ToUpperInvariant(), ct);

    public async Task<IEnumerable<Promotion>> GetActivePromotionsAsync(CancellationToken ct = default)
        => await _set.Where(p => p.IsActive && p.ValidFrom <= DateTime.UtcNow && p.ValidTo >= DateTime.UtcNow).AsNoTracking().ToListAsync(ct);
}

// ── DeliveryZone Repository ───────────────────────────────────────────────────
public class DeliveryZoneRepository : Repository<DeliveryZone>, IDeliveryZoneRepository
{
    public DeliveryZoneRepository(HampieeDbContext db) : base(db) { }

    public async Task<IEnumerable<DeliveryZone>> GetActiveZonesAsync(CancellationToken ct = default)
        => await _set.Where(z => z.IsActive).Include(z => z.AvailableSlots).OrderBy(z => z.DisplayOrder).AsNoTracking().ToListAsync(ct);

    public async Task<DeliveryZone?> FindZoneForDistrictAsync(string district, CancellationToken ct = default)
    {
        var zones = await _set.Where(z => z.IsActive).Include(z => z.AvailableSlots).AsNoTracking().ToListAsync(ct);
        return zones.FirstOrDefault(z => z.Districts.Any(d => string.Equals(d, district, StringComparison.OrdinalIgnoreCase)));
    }
}

// ── CmsBlock Repository ───────────────────────────────────────────────────────
public class CmsBlockRepository : Repository<CmsBlock>, ICmsBlockRepository
{
    public CmsBlockRepository(HampieeDbContext db) : base(db) { }

    public async Task<CmsBlock?> GetByKeyAsync(string key, CancellationToken ct = default)
        => await _set.FirstOrDefaultAsync(b => b.Key == key, ct);

    public async Task<IEnumerable<CmsBlock>> GetActiveByKeysAsync(IEnumerable<string> keys, CancellationToken ct = default)
    {
        var keyList = keys.ToList();
        var blocks = await _set.Where(b => keyList.Contains(b.Key)).OrderBy(b => b.DisplayOrder).AsNoTracking().ToListAsync(ct);
        return blocks.Where(b => b.IsCurrentlyActive);
    }
}
