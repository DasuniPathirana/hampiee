using Hampiee.Domain.Entities;

namespace Hampiee.Domain.Events;

public record ProductCreatedEvent(Guid ProductId, string ProductName) : IDomainEvent
{
    public DateTime OccurredOn { get; } = DateTime.UtcNow;
}

public record ProductOutOfStockEvent(Guid ProductId, string ProductName) : IDomainEvent
{
    public DateTime OccurredOn { get; } = DateTime.UtcNow;
}

public record OrderCreatedEvent(Guid OrderId, string OrderNumber, string CustomerEmail) : IDomainEvent
{
    public DateTime OccurredOn { get; } = DateTime.UtcNow;
}

public record OrderPaidEvent(Guid OrderId, string OrderNumber, string CustomerEmail, decimal Total) : IDomainEvent
{
    public DateTime OccurredOn { get; } = DateTime.UtcNow;
}

public record OrderDispatchedEvent(Guid OrderId, string OrderNumber, string CustomerEmail, string CustomerPhone) : IDomainEvent
{
    public DateTime OccurredOn { get; } = DateTime.UtcNow;
}
