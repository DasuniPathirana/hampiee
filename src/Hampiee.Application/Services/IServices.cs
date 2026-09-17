namespace Hampiee.Application.Services;

/// <summary>Payment gateway abstraction — supports PayHere, Stripe</summary>
public interface IPaymentService
{
    Task<PaymentInitResult> InitiatePaymentAsync(PaymentRequest request, CancellationToken ct = default);
    Task<PaymentVerifyResult> VerifyPaymentAsync(PaymentNotification notification, CancellationToken ct = default);
    Task<RefundResult> RefundAsync(string paymentReference, decimal amount, CancellationToken ct = default);
}

public record PaymentRequest(
    string OrderNumber,
    decimal Amount,
    string Currency,
    string CustomerName,
    string CustomerEmail,
    string CustomerPhone,
    string Description,
    string ReturnUrl,
    string CancelUrl,
    string NotifyUrl);

public record PaymentInitResult(
    bool Success,
    string? PaymentUrl,
    string? PaymentId,
    string? Error);

public record PaymentNotification(
    string OrderId,
    string PaymentId,
    string Amount,
    string Currency,
    string Status,
    string Method,
    string Hash,
    string? GatewayRaw);

public record PaymentVerifyResult(
    bool IsValid,
    bool IsPaid,
    string? PaymentReference,
    string? Error);

public record RefundResult(bool Success, string? Error);

/// <summary>Email notification service</summary>
public interface IEmailService
{
    Task SendOrderConfirmationAsync(string to, string customerName, string orderNumber, decimal total, CancellationToken ct = default);
    Task SendOrderDispatchedAsync(string to, string customerName, string orderNumber, string? trackingNumber, CancellationToken ct = default);
    Task SendOrderDeliveredAsync(string to, string customerName, string orderNumber, CancellationToken ct = default);
    Task SendWelcomeEmailAsync(string to, string customerName, CancellationToken ct = default);
    Task SendPasswordResetAsync(string to, string resetLink, CancellationToken ct = default);
    Task SendLowStockAlertAsync(string to, string productName, int stockQuantity, CancellationToken ct = default);
}

/// <summary>File/image storage abstraction</summary>
public interface IStorageService
{
    Task<string> UploadAsync(Stream stream, string fileName, string contentType, string folder = "products", CancellationToken ct = default);
    Task DeleteAsync(string url, CancellationToken ct = default);
    string GetPublicUrl(string path);
}

/// <summary>Cache abstraction (Redis)</summary>
public interface ICacheService
{
    Task<T?> GetAsync<T>(string key, CancellationToken ct = default);
    Task SetAsync<T>(string key, T value, TimeSpan? expiry = null, CancellationToken ct = default);
    Task RemoveAsync(string key, CancellationToken ct = default);
    Task RemoveByPatternAsync(string pattern, CancellationToken ct = default);
}
