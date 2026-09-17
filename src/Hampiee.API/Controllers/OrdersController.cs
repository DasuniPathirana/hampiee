using Hampiee.Application.Services;
using Hampiee.Domain.Entities;
using Hampiee.Domain.Repositories;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Hampiee.API.Hubs;
using Microsoft.AspNetCore.Authorization;

namespace Hampiee.API.Controllers;

[ApiController]
[Route("api/orders")]
public class OrdersController : ControllerBase
{
    private readonly IOrderRepository _orders;
    private readonly IProductRepository _products;
    private readonly IHamperRepository _hampers;
    private readonly IDeliveryZoneRepository _zones;
    private readonly IPromotionRepository _promotions;
    private readonly IPaymentService _payment;
    private readonly IEmailService _email;
    private readonly IHubContext<OrderTrackingHub> _hub;
    private readonly IConfiguration _config;

    public OrdersController(IOrderRepository orders, IProductRepository products, IHamperRepository hampers,
        IDeliveryZoneRepository zones, IPromotionRepository promotions, IPaymentService payment,
        IEmailService email, IHubContext<OrderTrackingHub> hub, IConfiguration config)
    {
        _orders = orders;
        _products = products;
        _hampers = hampers;
        _zones = zones;
        _promotions = promotions;
        _payment = payment;
        _email = email;
        _hub = hub;
        _config = config;
    }

    /// <summary>Create order and initiate payment</summary>
    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest req, CancellationToken ct)
    {
        // Build delivery address
        var address = new Address
        {
            RecipientName = req.DeliveryAddress.RecipientName,
            RecipientPhone = req.DeliveryAddress.RecipientPhone,
            Line1 = req.DeliveryAddress.Line1,
            Line2 = req.DeliveryAddress.Line2,
            City = req.DeliveryAddress.City,
            District = req.DeliveryAddress.District,
            PostalCode = req.DeliveryAddress.PostalCode
        };

        // Validate delivery zone
        var zone = await _zones.FindZoneForDistrictAsync(address.District, ct);
        if (zone == null)
            return BadRequest(new { message = "Delivery is not available to this area yet" });

        // Create order
        var customerId = GetCustomerId();
        var order = Order.Create(req.CustomerName, req.CustomerEmail, req.CustomerPhone, address, customerId);

        // Add items
        foreach (var item in req.Items)
        {
            if (item.ProductId.HasValue)
            {
                var product = await _products.GetByIdAsync(item.ProductId.Value, ct);
                if (product == null) return BadRequest(new { message = $"Product {item.ProductId} not found" });
                if (!product.HasStock) return BadRequest(new { message = $"'{product.Name}' is out of stock" });
                order.AddItem(product.Id, null, product.Name, product.Images.FirstOrDefault()?.Url ?? "", product.Price, item.Quantity);
            }
            else if (item.HamperId.HasValue)
            {
                var hamper = await _hampers.GetByIdAsync(item.HamperId.Value, ct);
                if (hamper == null) return BadRequest(new { message = $"Hamper {item.HamperId} not found" });
                var productPrices = new List<(Guid, decimal)>();
                foreach (var hi in hamper.Items)
                {
                    var p = await _products.GetByIdAsync(hi.ProductId, ct);
                    if (p != null) productPrices.Add((p.Id, p.Price));
                }
                var hamperPrice = hamper.CalculatedPrice(productPrices);
                order.AddItem(null, hamper.Id, hamper.Name, hamper.Images.FirstOrDefault()?.Url ?? "", hamperPrice, item.Quantity);
            }
        }

        // Apply delivery
        var deliveryFee = zone.GetDeliveryFee(order.SubTotal);
        order.SetDelivery(zone.Id, deliveryFee, req.RequestedDeliveryDate, req.TimeSlot);

        // Apply gift options
        order.SetGiftOptions(req.GiftMessage, req.GiftCardDesign, req.IncludeGiftWrap);

        // Apply discount code
        if (!string.IsNullOrWhiteSpace(req.DiscountCode))
        {
            var promo = await _promotions.GetByCodeAsync(req.DiscountCode.ToUpperInvariant(), ct);
            if (promo != null && promo.IsValid(order.SubTotal))
                order.ApplyDiscount(promo.Code, promo.CalculateDiscount(order.SubTotal));
            else
                return BadRequest(new { message = "Invalid or expired discount code" });
        }

        await _orders.AddAsync(order, ct);
        await _orders.SaveChangesAsync(ct);

        // Initiate PayHere payment
        var notifyUrl = $"{_config["AppUrl"]}/api/payments/payhere-notify";
        var returnUrl = $"{_config["AppUrl"]}/checkout/success?order={order.OrderNumber}";
        var cancelUrl = $"{_config["AppUrl"]}/checkout/cancel?order={order.OrderNumber}";

        var paymentResult = await _payment.InitiatePaymentAsync(new(
            order.OrderNumber, order.Total, "LKR",
            req.CustomerName, req.CustomerEmail, req.CustomerPhone,
            $"Hampiee Order {order.OrderNumber}",
            returnUrl, cancelUrl, notifyUrl), ct);

        order.MarkPaymentPending("PayHere", null);
        _orders.Update(order);
        await _orders.SaveChangesAsync(ct);

        return Ok(new { orderId = order.Id, orderNumber = order.OrderNumber, payment = paymentResult });
    }

    /// <summary>PayHere payment notification webhook</summary>
    [HttpPost("/api/payments/payhere-notify")]
    [AllowAnonymous]
    public async Task<IActionResult> PayHereNotify([FromForm] PayHereNotifyRequest req, CancellationToken ct)
    {
        var notification = new Application.Services.PaymentNotification(
            req.order_id, req.payment_id, req.payhere_amount,
            req.payhere_currency, req.status_code, req.method, req.md5sig, null);

        var result = await _payment.VerifyPaymentAsync(notification, ct);

        var order = await _orders.GetByOrderNumberAsync(req.order_id, ct);
        if (order == null) return NotFound();

        if (result.IsValid && result.IsPaid)
        {
            order.MarkPaid(result.PaymentReference!);
            _orders.Update(order);
            await _orders.SaveChangesAsync(ct);

            // Real-time update via SignalR
            await _hub.Clients.Group($"order-{order.OrderNumber}")
                .SendAsync("OrderStatusChanged", new { status = "Confirmed", orderNumber = order.OrderNumber }, ct);

            // Email confirmation
            await _email.SendOrderConfirmationAsync(
                order.CustomerEmail, order.CustomerName, order.OrderNumber, order.Total, ct);
        }
        else if (result.IsValid && !result.IsPaid)
        {
            order.MarkPaymentFailed(result.Error ?? "Unknown failure");
            _orders.Update(order);
            await _orders.SaveChangesAsync(ct);
        }

        return Ok("OK"); // PayHere expects "OK" response
    }

    /// <summary>Get order by order number (customer or admin)</summary>
    [HttpGet("{orderNumber}")]
    public async Task<IActionResult> GetOrder(string orderNumber, CancellationToken ct)
    {
        var order = await _orders.GetByOrderNumberAsync(orderNumber, ct);
        if (order == null) return NotFound();

        // Customers can only see their own orders
        var customerId = GetCustomerId();
        if (!User.IsInRole("Admin") && !User.IsInRole("SuperAdmin") && !User.IsInRole("Staff"))
        {
            if (order.CustomerId != customerId && !string.Equals(order.CustomerEmail,
                User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value, StringComparison.OrdinalIgnoreCase))
                return Forbid();
        }

        return Ok(MapOrderToResponse(order));
    }

    /// <summary>Get paginated orders (Admin)</summary>
    [HttpGet]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> GetOrders(
        [FromQuery] string? status, [FromQuery] string? search,
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var (items, total) = await _orders.GetPagedAsync(status, search, from, to, page, pageSize, ct);
        return Ok(new
        {
            items = items.Select(MapOrderToResponse),
            totalCount = total,
            page, pageSize,
            totalPages = (int)Math.Ceiling((double)total / pageSize)
        });
    }

    /// <summary>Update order status (Admin)</summary>
    [HttpPatch("{orderNumber}/status")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> UpdateStatus(string orderNumber, [FromBody] UpdateStatusRequest req, CancellationToken ct)
    {
        var order = await _orders.GetByOrderNumberAsync(orderNumber, ct);
        if (order == null) return NotFound();

        order.UpdateStatus(req.Status, req.Note);
        if (req.TrackingNumber != null) order.SetTrackingNumber(req.TrackingNumber);
        _orders.Update(order);
        await _orders.SaveChangesAsync(ct);

        // Real-time update
        await _hub.Clients.Group($"order-{order.OrderNumber}")
            .SendAsync("OrderStatusChanged", new { status = order.Status.ToString(), orderNumber = order.OrderNumber }, ct);

        // Dispatch email
        if (order.Status == Domain.Enums.OrderStatus.Dispatched)
            await _email.SendOrderDispatchedAsync(order.CustomerEmail, order.CustomerName,
                order.OrderNumber, order.TrackingNumber, ct);
        else if (order.Status == Domain.Enums.OrderStatus.Delivered)
            await _email.SendOrderDeliveredAsync(order.CustomerEmail, order.CustomerName, order.OrderNumber, ct);

        return Ok(MapOrderToResponse(order));
    }

    private Guid? GetCustomerId()
    {
        var claim = User.FindFirst("customerId")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }

    private static object MapOrderToResponse(Order o) => new
    {
        id = o.Id,
        orderNumber = o.OrderNumber,
        customerName = o.CustomerName,
        customerEmail = o.CustomerEmail,
        customerPhone = o.CustomerPhone,
        status = o.Status.ToString(),
        paymentStatus = o.PaymentStatus.ToString(),
        subTotal = o.SubTotal,
        deliveryFee = o.DeliveryFee,
        discountAmount = o.DiscountAmount,
        total = o.Total,
        giftMessage = o.GiftMessage,
        includeGiftWrap = o.IncludeGiftWrap,
        requestedDeliveryDate = o.RequestedDeliveryDate,
        timeSlot = o.TimeSlot,
        trackingNumber = o.TrackingNumber,
        items = o.Items.Select(i => new
        {
            i.Id, i.Name, i.UnitPrice, i.Quantity, i.LineTotal, i.ImageUrl
        }),
        statusHistory = o.StatusHistory.Select(h => new { h.Status, h.Note, h.CreatedAt }),
        createdAt = o.CreatedAt
    };
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

public record CreateOrderRequest(
    string CustomerName, string CustomerEmail, string CustomerPhone,
    AddressRequest DeliveryAddress,
    List<OrderItemRequest> Items,
    string? GiftMessage, string? GiftCardDesign, bool IncludeGiftWrap,
    string? DiscountCode, DateTime? RequestedDeliveryDate, string? TimeSlot);

public record AddressRequest(
    string RecipientName, string RecipientPhone,
    string Line1, string? Line2, string City, string District, string? PostalCode);

public record OrderItemRequest(Guid? ProductId, Guid? HamperId, int Quantity);

public record UpdateStatusRequest(Domain.Enums.OrderStatus Status, string? Note, string? TrackingNumber);

// PayHere webhook form fields
public class PayHereNotifyRequest
{
    public string merchant_id { get; set; } = "";
    public string order_id { get; set; } = "";
    public string payment_id { get; set; } = "";
    public string payhere_amount { get; set; } = "";
    public string payhere_currency { get; set; } = "";
    public string status_code { get; set; } = "";
    public string md5sig { get; set; } = "";
    public string method { get; set; } = "";
    public string status_message { get; set; } = "";
}
