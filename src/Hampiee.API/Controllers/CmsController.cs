using Hampiee.Domain.Entities;
using Hampiee.Domain.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hampiee.API.Controllers;

[ApiController]
[Route("api/cms")]
public class CmsController : ControllerBase
{
    private readonly ICmsBlockRepository _cms;
    private readonly ICacheService _cache;

    public CmsController(ICmsBlockRepository cms, ICacheService cache)
    {
        _cms = cms;
        _cache = cache;
    }

    /// <summary>Get active CMS blocks by key (public)</summary>
    [HttpGet]
    public async Task<IActionResult> GetBlocks([FromQuery] string[] keys, CancellationToken ct)
    {
        var cacheKey = $"cms:{string.Join(",", keys.OrderBy(k => k))}";
        var cached = await _cache.GetAsync<IEnumerable<object>>(cacheKey, ct);
        if (cached != null) return Ok(cached);

        var blocks = await _cms.GetActiveByKeysAsync(keys, ct);
        var result = blocks.Select(b => new
        {
            b.Key, b.Title, b.Subtitle, b.Body, b.ImageUrl, b.MobileImageUrl,
            b.VideoUrl, b.LinkUrl, b.LinkText, b.BackgroundColor, b.TextColor,
            b.DisplayOrder, b.MetaJson
        });

        await _cache.SetAsync(cacheKey, result, TimeSpan.FromMinutes(15), ct);
        return Ok(result);
    }

    /// <summary>Get all CMS blocks (Admin)</summary>
    [HttpGet("admin")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var blocks = await _cms.GetAllAsync(ct);
        return Ok(blocks);
    }

    /// <summary>Create CMS block (Admin)</summary>
    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Create([FromBody] CmsBlockRequest req, CancellationToken ct)
    {
        var block = CmsBlock.Create(req.Key, req.Title, req.DisplayOrder);
        block.Update(req.Title, req.Subtitle, req.Body, req.ImageUrl, req.MobileImageUrl,
            req.VideoUrl, req.LinkUrl, req.LinkText, req.BackgroundColor, req.TextColor,
            req.DisplayOrder, req.MetaJson);

        await _cms.AddAsync(block, ct);
        await _cms.SaveChangesAsync(ct);
        await _cache.RemoveByPatternAsync("cms:*", ct);
        return CreatedAtAction(null, new { key = block.Key }, block);
    }

    /// <summary>Update CMS block (Admin)</summary>
    [HttpPut("{key}")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> Update(string key, [FromBody] CmsBlockRequest req, CancellationToken ct)
    {
        var block = await _cms.GetByKeyAsync(key, ct);
        if (block == null) return NotFound();

        block.Update(req.Title, req.Subtitle, req.Body, req.ImageUrl, req.MobileImageUrl,
            req.VideoUrl, req.LinkUrl, req.LinkText, req.BackgroundColor, req.TextColor,
            req.DisplayOrder, req.MetaJson);
        if (req.ScheduleFrom.HasValue || req.ScheduleTo.HasValue)
            block.Schedule(req.ScheduleFrom, req.ScheduleTo);
        if (req.IsActive) block.Activate(); else block.Deactivate();

        _cms.Update(block);
        await _cms.SaveChangesAsync(ct);
        await _cache.RemoveByPatternAsync("cms:*", ct);
        return Ok(block);
    }
}

public record CmsBlockRequest(
    string Key, string Title, string? Subtitle, string? Body,
    string? ImageUrl, string? MobileImageUrl, string? VideoUrl,
    string? LinkUrl, string? LinkText, string? BackgroundColor, string? TextColor,
    int DisplayOrder, string? MetaJson, bool IsActive,
    DateTime? ScheduleFrom, DateTime? ScheduleTo);

// ────────────────────────────────────────────────────────────────────────────

[ApiController]
[Route("api/delivery-zones")]
public class DeliveryZonesController : ControllerBase
{
    private readonly IDeliveryZoneRepository _zones;

    public DeliveryZonesController(IDeliveryZoneRepository zones) => _zones = zones;

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var zones = await _zones.GetActiveZonesAsync(ct);
        return Ok(zones.Select(z => new
        {
            z.Id, z.Name, z.Districts, z.BasePrice,
            z.FreeDeliveryThreshold, z.EstimatedDelivery,
            z.IsSameDay, Slots = z.AvailableSlots
        }));
    }

    [HttpGet("check")]
    public async Task<IActionResult> CheckDistrict([FromQuery] string district, [FromQuery] decimal? orderTotal, CancellationToken ct)
    {
        var zone = await _zones.FindZoneForDistrictAsync(district, ct);
        if (zone == null) return Ok(new { available = false });

        var fee = orderTotal.HasValue ? zone.GetDeliveryFee(orderTotal.Value) : zone.BasePrice;
        return Ok(new
        {
            available = true,
            zoneId = zone.Id,
            zoneName = zone.Name,
            deliveryFee = fee,
            freeDeliveryThreshold = zone.FreeDeliveryThreshold,
            estimatedDelivery = zone.EstimatedDelivery,
            isSameDay = zone.IsSameDay,
            slots = zone.AvailableSlots
        });
    }
}

// ────────────────────────────────────────────────────────────────────────────

[ApiController]
[Route("api/promotions")]
public class PromotionsController : ControllerBase
{
    private readonly IPromotionRepository _promotions;

    public PromotionsController(IPromotionRepository promotions) => _promotions = promotions;

    [HttpPost("validate")]
    public async Task<IActionResult> Validate([FromBody] ValidatePromoRequest req, CancellationToken ct)
    {
        var promo = await _promotions.GetByCodeAsync(req.Code.ToUpperInvariant(), ct);
        if (promo == null || !promo.IsValid(req.OrderTotal))
            return Ok(new { valid = false, message = "Invalid or expired discount code" });

        var discount = promo.CalculateDiscount(req.OrderTotal);
        return Ok(new
        {
            valid = true,
            code = promo.Code,
            discount,
            description = promo.Description,
            discountType = promo.DiscountType.ToString()
        });
    }
}

public record ValidatePromoRequest(string Code, decimal OrderTotal);

// ICacheService needs to be resolved - make sure it's available
public interface ICacheService
{
    Task<T?> GetAsync<T>(string key, CancellationToken ct = default);
    Task SetAsync<T>(string key, T value, TimeSpan? expiry = null, CancellationToken ct = default);
    Task RemoveAsync(string key, CancellationToken ct = default);
    Task RemoveByPatternAsync(string pattern, CancellationToken ct = default);
}
