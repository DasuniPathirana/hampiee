using Hampiee.Application.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SendGrid;
using SendGrid.Helpers.Mail;

namespace Hampiee.Infrastructure.Email;

public class SendGridEmailService : IEmailService
{
    private readonly ISendGridClient _client;
    private readonly IConfiguration _config;
    private readonly ILogger<SendGridEmailService> _logger;

    private string FromEmail => _config["SendGrid:FromEmail"] ?? "noreply@hampiee.com";
    private string FromName => _config["SendGrid:FromName"] ?? "Hampiee";

    public SendGridEmailService(ISendGridClient client, IConfiguration config, ILogger<SendGridEmailService> logger)
    {
        _client = client;
        _config = config;
        _logger = logger;
    }

    public async Task SendOrderConfirmationAsync(string to, string customerName, string orderNumber,
        decimal total, CancellationToken ct = default)
    {
        var subject = $"🎁 Your Hampiee order {orderNumber} is confirmed!";
        var html = $"""
            <div style="font-family: 'DM Sans', sans-serif; max-width: 600px; margin: 0 auto; background: #FAFAF8;">
              <div style="background: #1A1A2E; padding: 40px; text-align: center;">
                <h1 style="color: #C9A96E; margin: 0; font-family: 'Playfair Display', serif;">Hampiee</h1>
                <p style="color: #ffffff; opacity: 0.8;">Premium Sri Lankan Gifting</p>
              </div>
              <div style="padding: 40px;">
                <h2 style="color: #1A1A2E;">Order Confirmed! 🎉</h2>
                <p>Dear {customerName},</p>
                <p>Thank you for your order. We're preparing your gift hamper with love!</p>
                <div style="background: #ffffff; border-radius: 8px; padding: 24px; margin: 24px 0; border-left: 4px solid #C9A96E;">
                  <strong>Order Number:</strong> {orderNumber}<br/>
                  <strong>Total:</strong> LKR {total:N2}
                </div>
                <p>You'll receive another email when your order is dispatched.</p>
                <a href="https://hampiee.com/orders/{orderNumber}" 
                   style="display: inline-block; background: #C9A96E; color: white; padding: 12px 32px; 
                          border-radius: 30px; text-decoration: none; font-weight: 600; margin-top: 16px;">
                  Track Your Order
                </a>
              </div>
              <div style="background: #1A1A2E; padding: 24px; text-align: center; color: #ffffff; opacity: 0.7; font-size: 12px;">
                © 2026 Hampiee. Premium Sri Lankan Gifting.
              </div>
            </div>
            """;
        await SendAsync(to, customerName, subject, html, ct);
    }

    public async Task SendOrderDispatchedAsync(string to, string customerName, string orderNumber,
        string? trackingNumber, CancellationToken ct = default)
    {
        var subject = $"📦 Your Hampiee order {orderNumber} is on its way!";
        var trackingInfo = trackingNumber != null ? $"<p><strong>Tracking Number:</strong> {trackingNumber}</p>" : "";
        var html = $"""
            <div style="font-family: 'DM Sans', sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #1A1A2E; padding: 40px; text-align: center;">
                <h1 style="color: #C9A96E; margin: 0;">Hampiee</h1>
              </div>
              <div style="padding: 40px;">
                <h2>Your gift is on its way! 🚚</h2>
                <p>Dear {customerName},</p>
                <p>Great news! Your order <strong>{orderNumber}</strong> has been dispatched.</p>
                {trackingInfo}
                <a href="https://hampiee.com/orders/{orderNumber}" 
                   style="display: inline-block; background: #C9A96E; color: white; padding: 12px 32px; 
                          border-radius: 30px; text-decoration: none; font-weight: 600;">
                  Track Your Order
                </a>
              </div>
            </div>
            """;
        await SendAsync(to, customerName, subject, html, ct);
    }

    public async Task SendOrderDeliveredAsync(string to, string customerName, string orderNumber, CancellationToken ct = default)
    {
        var subject = $"✅ Your Hampiee order {orderNumber} has been delivered!";
        var html = $"""
            <div style="font-family: 'DM Sans', sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #1A1A2E; padding: 40px; text-align: center;">
                <h1 style="color: #C9A96E; margin: 0;">Hampiee</h1>
              </div>
              <div style="padding: 40px;">
                <h2>Delivered with love! ❤️</h2>
                <p>Dear {customerName}, your order <strong>{orderNumber}</strong> has been delivered.</p>
                <p>We hope the recipient loved their gift! Please leave us a review.</p>
              </div>
            </div>
            """;
        await SendAsync(to, customerName, subject, html, ct);
    }

    public async Task SendWelcomeEmailAsync(string to, string customerName, CancellationToken ct = default)
    {
        var subject = "Welcome to Hampiee 🎁";
        var html = $"""
            <div style="font-family: 'DM Sans', sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #1A1A2E; padding: 40px; text-align: center;">
                <h1 style="color: #C9A96E; margin: 0;">Welcome to Hampiee</h1>
                <p style="color: #ffffff;">Premium Sri Lankan Gifting</p>
              </div>
              <div style="padding: 40px;">
                <h2>Welcome, {customerName}! 🌴</h2>
                <p>Thank you for joining Hampiee. Discover our curated collection of premium Sri Lankan gift hampers.</p>
                <a href="https://hampiee.com/collections" 
                   style="display: inline-block; background: #C9A96E; color: white; padding: 12px 32px; 
                          border-radius: 30px; text-decoration: none; font-weight: 600;">
                  Shop Now
                </a>
              </div>
            </div>
            """;
        await SendAsync(to, customerName, subject, html, ct);
    }

    public async Task SendPasswordResetAsync(string to, string resetLink, CancellationToken ct = default)
    {
        var html = $"""
            <div style="padding: 40px; font-family: sans-serif;">
              <h2>Password Reset</h2>
              <p>Click the link below to reset your password (valid for 1 hour):</p>
              <a href="{resetLink}" style="background: #1A1A2E; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
                Reset Password
              </a>
            </div>
            """;
        await SendAsync(to, "Hampiee Customer", "Reset your Hampiee password", html, ct);
    }

    public async Task SendLowStockAlertAsync(string to, string productName, int stockQuantity, CancellationToken ct = default)
    {
        var html = $"<p>⚠️ Low stock alert: <strong>{productName}</strong> has only {stockQuantity} units remaining.</p>";
        await SendAsync(to, "Admin", $"Low Stock Alert: {productName}", html, ct);
    }

    private async Task SendAsync(string to, string toName, string subject, string html, CancellationToken ct)
    {
        try
        {
            var msg = MailHelper.CreateSingleEmail(
                new EmailAddress(FromEmail, FromName),
                new EmailAddress(to, toName),
                subject, null, html);
            var response = await _client.SendEmailAsync(msg, ct);
            if (!response.IsSuccessStatusCode)
                _logger.LogWarning("SendGrid error {StatusCode} sending to {Email}", response.StatusCode, to);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email}", to);
        }
    }
}
