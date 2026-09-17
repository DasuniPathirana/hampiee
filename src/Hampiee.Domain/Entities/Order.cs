using Hampiee.Domain.Enums;
using Hampiee.Domain.Events;
using Hampiee.Domain.ValueObjects;

namespace Hampiee.Domain.Entities;

/// <summary>Customer order aggregate root</summary>
public class Order : BaseEntity
{
    public string OrderNumber { get; private set; } = string.Empty;
    public Guid? CustomerId { get; private set; }
    public Customer? Customer { get; private set; }

    // Guest checkout support
    public string CustomerEmail { get; private set; } = string.Empty;
    public string CustomerPhone { get; private set; } = string.Empty;
    public string CustomerName { get; private set; } = string.Empty;

    public OrderStatus Status { get; private set; } = OrderStatus.Pending;
    public PaymentStatus PaymentStatus { get; private set; } = PaymentStatus.Pending;
    public string? PaymentReference { get; private set; }
    public string? PaymentGateway { get; private set; }

    public Address DeliveryAddress { get; private set; } = null!;
    public DeliveryZone? Zone { get; private set; }
    public Guid? ZoneId { get; private set; }
    public DateTime? RequestedDeliveryDate { get; private set; }
    public string? TimeSlot { get; private set; }

    public string? GiftMessage { get; private set; }
    public string? GiftCardDesign { get; private set; }
    public bool IncludeGiftWrap { get; private set; }

    public decimal SubTotal { get; private set; }
    public decimal DeliveryFee { get; private set; }
    public decimal DiscountAmount { get; private set; }
    public decimal Total { get; private set; }
    public string? DiscountCode { get; private set; }

    public string? Notes { get; private set; }
    public string? TrackingNumber { get; private set; }

    private readonly List<OrderItem> _items = [];
    public IReadOnlyCollection<OrderItem> Items => _items.AsReadOnly();

    private readonly List<OrderStatusHistory> _statusHistory = [];
    public IReadOnlyCollection<OrderStatusHistory> StatusHistory => _statusHistory.AsReadOnly();

    private Order() { }

    public static Order Create(
        string customerName,
        string customerEmail,
        string customerPhone,
        Address deliveryAddress,
        Guid? customerId = null)
    {
        var order = new Order
        {
            OrderNumber = GenerateOrderNumber(),
            CustomerName = customerName,
            CustomerEmail = customerEmail,
            CustomerPhone = customerPhone,
            DeliveryAddress = deliveryAddress,
            CustomerId = customerId
        };
        order._statusHistory.Add(new OrderStatusHistory
        {
            OrderId = order.Id,
            Status = OrderStatus.Pending,
            Note = "Order created"
        });
        order.AddDomainEvent(new OrderCreatedEvent(order.Id, order.OrderNumber, customerEmail));
        return order;
    }

    public void AddItem(Guid? productId, Guid? hamperId, string name, string imageUrl,
        decimal unitPrice, int quantity)
    {
        _items.Add(new OrderItem
        {
            OrderId = Id,
            ProductId = productId,
            HamperId = hamperId,
            Name = name,
            ImageUrl = imageUrl,
            UnitPrice = unitPrice,
            Quantity = quantity
        });
        RecalculateTotals();
    }

    public void SetDelivery(Guid zoneId, decimal deliveryFee, DateTime? requestedDate, string? timeSlot)
    {
        ZoneId = zoneId;
        DeliveryFee = deliveryFee;
        RequestedDeliveryDate = requestedDate;
        TimeSlot = timeSlot;
        RecalculateTotals();
        MarkUpdated();
    }

    public void SetGiftOptions(string? message, string? cardDesign, bool includeWrap)
    {
        GiftMessage = message;
        GiftCardDesign = cardDesign;
        IncludeGiftWrap = includeWrap;
        MarkUpdated();
    }

    public void ApplyDiscount(string code, decimal amount)
    {
        DiscountCode = code;
        DiscountAmount = amount;
        RecalculateTotals();
        MarkUpdated();
    }

    public void MarkPaymentPending(string gateway, string? reference)
    {
        PaymentGateway = gateway;
        PaymentReference = reference;
        MarkUpdated();
    }

    public void MarkPaid(string paymentReference)
    {
        PaymentStatus = PaymentStatus.Paid;
        PaymentReference = paymentReference;
        UpdateStatus(OrderStatus.Confirmed, "Payment confirmed");
        AddDomainEvent(new OrderPaidEvent(Id, OrderNumber, CustomerEmail, Total));
        MarkUpdated();
    }

    public void MarkPaymentFailed(string reason)
    {
        PaymentStatus = PaymentStatus.Failed;
        UpdateStatus(OrderStatus.PaymentFailed, $"Payment failed: {reason}");
        MarkUpdated();
    }

    public void UpdateStatus(OrderStatus status, string? note = null)
    {
        Status = status;
        _statusHistory.Add(new OrderStatusHistory { OrderId = Id, Status = status, Note = note });
        if (status == OrderStatus.Dispatched)
            AddDomainEvent(new OrderDispatchedEvent(Id, OrderNumber, CustomerEmail, CustomerPhone));
        MarkUpdated();
    }

    public void SetTrackingNumber(string trackingNumber) { TrackingNumber = trackingNumber; MarkUpdated(); }

    private void RecalculateTotals()
    {
        SubTotal = _items.Sum(i => i.UnitPrice * i.Quantity);
        Total = SubTotal + DeliveryFee - DiscountAmount;
    }

    private static string GenerateOrderNumber()
    {
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString()[^6..];
        var random = new Random().Next(100, 999);
        return $"HMP-{timestamp}-{random}";
    }
}

public class OrderItem
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid OrderId { get; init; }
    public Guid? ProductId { get; init; }
    public Guid? HamperId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string ImageUrl { get; init; } = string.Empty;
    public decimal UnitPrice { get; init; }
    public int Quantity { get; init; }
    public decimal LineTotal => UnitPrice * Quantity;
    public List<CustomHamperLine>? CustomItems { get; init; }
}

public record CustomHamperLine(Guid ProductId, string ProductName, int Quantity, decimal UnitPrice);

public class OrderStatusHistory
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid OrderId { get; init; }
    public OrderStatus Status { get; init; }
    public string? Note { get; init; }
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
}
