using Hampiee.Domain.Enums;

namespace Hampiee.Domain.Entities;

/// <summary>Promotional discount code or automatic promotion</summary>
public class Promotion : BaseEntity
{
    public string Code { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public DiscountType DiscountType { get; private set; }
    public decimal Value { get; private set; } // % or LKR amount
    public decimal? MinimumOrderAmount { get; private set; }
    public int? MaxUsageTotal { get; private set; }
    public int? MaxUsagePerCustomer { get; private set; }
    public int UsageCount { get; private set; }
    public DateTime ValidFrom { get; private set; }
    public DateTime ValidTo { get; private set; }
    public bool IsActive { get; private set; } = true;
    public bool IsAutomatic { get; private set; } // Applied without code
    public Guid? CategoryId { get; private set; } // Restrict to category

    private Promotion() { }

    public static Promotion Create(string code, string description, DiscountType type,
        decimal value, DateTime validFrom, DateTime validTo, decimal? minimumOrder = null,
        int? maxUsage = null, int? maxPerCustomer = null)
        => new()
        {
            Code = code.ToUpperInvariant(),
            Description = description,
            DiscountType = type,
            Value = value,
            ValidFrom = validFrom,
            ValidTo = validTo,
            MinimumOrderAmount = minimumOrder,
            MaxUsageTotal = maxUsage,
            MaxUsagePerCustomer = maxPerCustomer
        };

    public bool IsValid(decimal orderTotal, int customerUsage = 0)
    {
        if (!IsActive) return false;
        if (DateTime.UtcNow < ValidFrom || DateTime.UtcNow > ValidTo) return false;
        if (MinimumOrderAmount.HasValue && orderTotal < MinimumOrderAmount.Value) return false;
        if (MaxUsageTotal.HasValue && UsageCount >= MaxUsageTotal.Value) return false;
        if (MaxUsagePerCustomer.HasValue && customerUsage >= MaxUsagePerCustomer.Value) return false;
        return true;
    }

    public decimal CalculateDiscount(decimal orderTotal) => DiscountType switch
    {
        DiscountType.Percentage => Math.Round(orderTotal * Value / 100, 2),
        DiscountType.FixedAmount => Math.Min(Value, orderTotal),
        DiscountType.FreeDelivery => 0, // Handled separately
        _ => 0
    };

    public void RecordUsage() { UsageCount++; MarkUpdated(); }
    public void Deactivate() { IsActive = false; MarkUpdated(); }
}
