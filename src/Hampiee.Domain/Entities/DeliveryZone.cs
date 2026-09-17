using Hampiee.Domain.Enums;

namespace Hampiee.Domain.Entities;

/// <summary>Delivery zone with geographic polygon and pricing</summary>
public class DeliveryZone : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public string[] Districts { get; private set; } = [];
    public decimal BasePrice { get; private set; }
    public decimal? FreeDeliveryThreshold { get; private set; }
    public int EstimatedDaysMin { get; private set; } = 1;
    public int EstimatedDaysMax { get; private set; } = 3;
    public bool IsActive { get; private set; } = true;
    public bool IsSameDay { get; private set; }
    public string? Notes { get; private set; }
    public int DisplayOrder { get; private set; }

    private readonly List<DeliverySlot> _slots = [];
    public IReadOnlyCollection<DeliverySlot> AvailableSlots => _slots.AsReadOnly();

    private DeliveryZone() { }

    public static DeliveryZone Create(string name, string[] districts, decimal basePrice,
        int estimatedDaysMin = 1, int estimatedDaysMax = 3)
        => new()
        {
            Name = name,
            Districts = districts,
            BasePrice = basePrice,
            EstimatedDaysMin = estimatedDaysMin,
            EstimatedDaysMax = estimatedDaysMax
        };

    public void UpdatePricing(decimal basePrice, decimal? freeDeliveryThreshold)
    {
        BasePrice = basePrice;
        FreeDeliveryThreshold = freeDeliveryThreshold;
        MarkUpdated();
    }

    public void AddSlot(string label, string startTime, string endTime, int capacity)
        => _slots.Add(new DeliverySlot { ZoneId = Id, Label = label, StartTime = startTime, EndTime = endTime, DailyCapacity = capacity });

    public bool OffersFreDelivery(decimal orderTotal)
        => FreeDeliveryThreshold.HasValue && orderTotal >= FreeDeliveryThreshold.Value;

    public decimal GetDeliveryFee(decimal orderTotal)
        => OffersFreDelivery(orderTotal) ? 0 : BasePrice;

    public string EstimatedDelivery => EstimatedDaysMin == EstimatedDaysMax
        ? $"{EstimatedDaysMin} day{(EstimatedDaysMin == 1 ? "" : "s")}"
        : $"{EstimatedDaysMin}–{EstimatedDaysMax} days";
}

public class DeliverySlot
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid ZoneId { get; init; }
    public string Label { get; init; } = string.Empty; // e.g. "Morning (9am–12pm)"
    public string StartTime { get; init; } = string.Empty;
    public string EndTime { get; init; } = string.Empty;
    public int DailyCapacity { get; init; }
}
