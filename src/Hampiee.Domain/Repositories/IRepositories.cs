using Hampiee.Domain.Entities;

namespace Hampiee.Domain.Repositories;

public interface IRepository<T> where T : BaseEntity
{
    Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IEnumerable<T>> GetAllAsync(CancellationToken ct = default);
    Task AddAsync(T entity, CancellationToken ct = default);
    void Update(T entity);
    void Delete(T entity);
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}

public interface IProductRepository : IRepository<Product>
{
    Task<Product?> GetBySlugAsync(string slug, CancellationToken ct = default);
    Task<IEnumerable<Product>> GetByCategoryAsync(Guid categoryId, CancellationToken ct = default);
    Task<IEnumerable<Product>> GetFeaturedAsync(int count = 8, CancellationToken ct = default);
    Task<(IEnumerable<Product> Items, int TotalCount)> SearchAsync(
        string? query, Guid? categoryId, decimal? minPrice, decimal? maxPrice,
        bool? inStock, int page, int pageSize, string sortBy, CancellationToken ct = default);
}

public interface IHamperRepository : IRepository<Hamper>
{
    Task<Hamper?> GetBySlugAsync(string slug, CancellationToken ct = default);
    Task<IEnumerable<Hamper>> GetFeaturedAsync(int count = 8, CancellationToken ct = default);
    Task<(IEnumerable<Hamper> Items, int TotalCount)> GetPagedAsync(
        Guid? categoryId, decimal? minPrice, decimal? maxPrice,
        int page, int pageSize, CancellationToken ct = default);
}

public interface IOrderRepository : IRepository<Order>
{
    Task<Order?> GetByOrderNumberAsync(string orderNumber, CancellationToken ct = default);
    Task<IEnumerable<Order>> GetByCustomerAsync(Guid customerId, CancellationToken ct = default);
    Task<(IEnumerable<Order> Items, int TotalCount)> GetPagedAsync(
        string? status, string? search, DateOnly? from, DateOnly? to,
        int page, int pageSize, CancellationToken ct = default);
}

public interface ICustomerRepository : IRepository<Customer>
{
    Task<Customer?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task<(IEnumerable<Customer> Items, int TotalCount)> GetPagedAsync(
        string? search, int page, int pageSize, CancellationToken ct = default);
}

public interface ICategoryRepository : IRepository<Category>
{
    Task<Category?> GetBySlugAsync(string slug, CancellationToken ct = default);
    Task<IEnumerable<Category>> GetTopLevelAsync(CancellationToken ct = default);
    Task<IEnumerable<Category>> GetWithChildrenAsync(CancellationToken ct = default);
}

public interface IPromotionRepository : IRepository<Promotion>
{
    Task<Promotion?> GetByCodeAsync(string code, CancellationToken ct = default);
    Task<IEnumerable<Promotion>> GetActivePromotionsAsync(CancellationToken ct = default);
}

public interface IDeliveryZoneRepository : IRepository<DeliveryZone>
{
    Task<IEnumerable<DeliveryZone>> GetActiveZonesAsync(CancellationToken ct = default);
    Task<DeliveryZone?> FindZoneForDistrictAsync(string district, CancellationToken ct = default);
}

public interface ICmsBlockRepository : IRepository<CmsBlock>
{
    Task<CmsBlock?> GetByKeyAsync(string key, CancellationToken ct = default);
    Task<IEnumerable<CmsBlock>> GetActiveByKeysAsync(IEnumerable<string> keys, CancellationToken ct = default);
}
