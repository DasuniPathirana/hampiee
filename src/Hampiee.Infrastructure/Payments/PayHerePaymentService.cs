using Hampiee.Application.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Hampiee.Infrastructure.Payments;

/// <summary>
/// PayHere Sri Lanka payment gateway integration.
/// Docs: https://support.payhere.lk/api-&-mobile-sdk/payhere-checkout
/// </summary>
public class PayHerePaymentService : IPaymentService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private readonly ILogger<PayHerePaymentService> _logger;

    private string MerchantId => _config["PayHere:MerchantId"]!;
    private string MerchantSecret => _config["PayHere:MerchantSecret"]!;
    private bool IsSandbox => _config.GetValue<bool>("PayHere:Sandbox", true);

    private string BaseUrl => IsSandbox
        ? "https://sandbox.payhere.lk/pay/checkout"
        : "https://www.payhere.lk/pay/checkout";

    public PayHerePaymentService(HttpClient httpClient, IConfiguration config, ILogger<PayHerePaymentService> logger)
    {
        _httpClient = httpClient;
        _config = config;
        _logger = logger;
    }

    public Task<PaymentInitResult> InitiatePaymentAsync(PaymentRequest request, CancellationToken ct = default)
    {
        // PayHere uses a form POST redirect approach (not REST API call)
        // We generate the hash here; the frontend will POST the form to PayHere

        var hash = GenerateHash(request.OrderNumber, request.Amount, request.Currency);

        var paymentUrl = BaseUrl;
        var formData = new Dictionary<string, string>
        {
            ["merchant_id"] = MerchantId,
            ["return_url"] = request.ReturnUrl,
            ["cancel_url"] = request.CancelUrl,
            ["notify_url"] = request.NotifyUrl,
            ["order_id"] = request.OrderNumber,
            ["items"] = request.Description,
            ["currency"] = request.Currency,
            ["amount"] = request.Amount.ToString("F2"),
            ["first_name"] = request.CustomerName.Split(' ')[0],
            ["last_name"] = request.CustomerName.Contains(' ') ? string.Join(' ', request.CustomerName.Split(' ')[1..]) : "",
            ["email"] = request.CustomerEmail,
            ["phone"] = request.CustomerPhone,
            ["hash"] = hash
        };

        // Return form data as JSON-serialized payload for frontend to construct and submit the form
        var formJson = JsonSerializer.Serialize(formData);

        return Task.FromResult(new PaymentInitResult(
            Success: true,
            PaymentUrl: paymentUrl,
            PaymentId: formJson, // Frontend uses this to build the redirect form
            Error: null));
    }

    public Task<PaymentVerifyResult> VerifyPaymentAsync(PaymentNotification notification, CancellationToken ct = default)
    {
        _logger.LogInformation("PayHere notification received for order {OrderId}, status {Status}",
            notification.OrderId, notification.Status);

        // Verify hash from PayHere notification
        // MD5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + MD5(merchant_secret))
        var localHash = GenerateNotificationHash(
            notification.OrderId,
            notification.Amount,
            notification.Currency,
            notification.Status);

        if (!string.Equals(localHash, notification.Hash, StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("PayHere hash mismatch for order {OrderId}", notification.OrderId);
            return Task.FromResult(new PaymentVerifyResult(false, false, null, "Hash verification failed"));
        }

        // Status 2 = SUCCESS in PayHere
        var isPaid = notification.Status == "2";

        return Task.FromResult(new PaymentVerifyResult(
            IsValid: true,
            IsPaid: isPaid,
            PaymentReference: notification.PaymentId,
            Error: isPaid ? null : $"Payment status: {notification.Status}"));
    }

    public Task<RefundResult> RefundAsync(string paymentReference, decimal amount, CancellationToken ct = default)
    {
        // PayHere refund via their dashboard/API — implement when needed
        _logger.LogWarning("Refund requested for {Reference}, amount {Amount} — manual processing required", paymentReference, amount);
        return Task.FromResult(new RefundResult(false, "Manual refund processing required via PayHere dashboard"));
    }

    /// <summary>Hash for initiating payment: MD5(merchant_id + order_id + amount + currency + MD5(merchant_secret))</summary>
    private string GenerateHash(string orderId, decimal amount, string currency)
    {
        var secretHash = ComputeMd5(MerchantSecret).ToUpperInvariant();
        var raw = $"{MerchantId}{orderId}{amount:F2}{currency}{secretHash}";
        return ComputeMd5(raw).ToUpperInvariant();
    }

    /// <summary>Hash for notification verification: MD5(merchant_id + order_id + amount + currency + status + MD5(merchant_secret))</summary>
    private string GenerateNotificationHash(string orderId, string amount, string currency, string statusCode)
    {
        var secretHash = ComputeMd5(MerchantSecret).ToUpperInvariant();
        var raw = $"{MerchantId}{orderId}{amount}{currency}{statusCode}{secretHash}";
        return ComputeMd5(raw).ToUpperInvariant();
    }

    private static string ComputeMd5(string input)
    {
        var bytes = Encoding.UTF8.GetBytes(input);
        var hash = MD5.HashData(bytes);
        return Convert.ToHexString(hash);
    }
}
