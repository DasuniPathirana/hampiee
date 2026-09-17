namespace Hampiee.Domain.Enums;

public enum OrderStatus
{
    Pending = 0,
    PaymentFailed = 1,
    Confirmed = 2,
    Processing = 3,
    Packed = 4,
    Dispatched = 5,
    OutForDelivery = 6,
    Delivered = 7,
    Cancelled = 8,
    Refunded = 9
}

public enum PaymentStatus
{
    Pending = 0,
    Paid = 1,
    Failed = 2,
    Refunded = 3,
    PartiallyRefunded = 4
}

public enum DiscountType
{
    Percentage = 0,
    FixedAmount = 1,
    FreeDelivery = 2
}

public enum UserRole
{
    Customer = 0,
    Staff = 1,
    Admin = 2,
    SuperAdmin = 3
}
