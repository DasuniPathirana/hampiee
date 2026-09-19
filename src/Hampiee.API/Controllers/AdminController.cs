using Hampiee.Application.Services;
using Hampiee.Domain.Repositories;
using Hampiee.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Hampiee.API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = "StaffOrAdmin")]
public class AdminController : ControllerBase
{
    private readonly HampieeDbContext _db;
    private readonly ICacheService _cache;

    public AdminController(HampieeDbContext db, ICacheService cache)
    {
        _db = db;
        _cache = cache;
    }

    /// <summary>Main dashboard stats — revenue, orders, customers, low stock, recent orders</summary>
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var thisMonthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var lastMonthStart = thisMonthStart.AddMonths(-1);

        // Revenue
        var thisMonthRevenue = await _db.Orders
            .Where(o => o.CreatedAt >= thisMonthStart && o.PaymentStatus == Domain.Enums.PaymentStatus.Paid)
            .SumAsync(o => o.Total, ct);
        var lastMonthRevenue = await _db.Orders
            .Where(o => o.CreatedAt >= lastMonthStart && o.CreatedAt < thisMonthStart && o.PaymentStatus == Domain.Enums.PaymentStatus.Paid)
            .SumAsync(o => o.Total, ct);
        var revenueGrowth = lastMonthRevenue == 0 ? 100 : Math.Round((double)(thisMonthRevenue - lastMonthRevenue) / (double)lastMonthRevenue * 100, 1);

        // Orders
        var thisMonthOrders = await _db.Orders.CountAsync(o => o.CreatedAt >= thisMonthStart, ct);
        var lastMonthOrders = await _db.Orders.CountAsync(o => o.CreatedAt >= lastMonthStart && o.CreatedAt < thisMonthStart, ct);
        var ordersGrowth = lastMonthOrders == 0 ? 100 : Math.Round((double)(thisMonthOrders - lastMonthOrders) / lastMonthOrders * 100, 1);

        // Customers
        var totalCustomers = await _db.Customers.CountAsync(ct);
        var newCustomers = await _db.Customers.CountAsync(c => c.CreatedAt >= thisMonthStart, ct);
        var prevCustomers = await _db.Customers.CountAsync(c => c.CreatedAt >= lastMonthStart && c.CreatedAt < thisMonthStart, ct);
        var customersGrowth = prevCustomers == 0 ? 100 : Math.Round((double)(newCustomers - prevCustomers) / prevCustomers * 100, 1);

        // AOV
        var totalPaidOrders = await _db.Orders.CountAsync(o => o.PaymentStatus == Domain.Enums.PaymentStatus.Paid, ct);
        var totalRevenue = await _db.Orders.Where(o => o.PaymentStatus == Domain.Enums.PaymentStatus.Paid).SumAsync(o => o.Total, ct);
        var avgOrderValue = totalPaidOrders == 0 ? 0 : totalRevenue / totalPaidOrders;

        // Alerts
        var pendingOrders = await _db.Orders.CountAsync(o => o.Status == Domain.Enums.OrderStatus.Pending, ct);
        var lowStockProducts = await _db.Products.CountAsync(p => !p.IsDeleted && p.StockQuantity <= 5, ct);

        // Recent orders
        var recentOrders = await _db.Orders
            .OrderByDescending(o => o.CreatedAt)
            .Take(10)
            .Select(o => new
            {
                o.OrderNumber, o.CustomerName, o.CustomerEmail,
                Total = o.Total, Status = o.Status.ToString(),
                District = o.DeliveryAddress.District,
                o.CreatedAt
            })
            .ToListAsync(ct);

        return Ok(new
        {
            totalRevenue,
            revenueGrowth,
            totalOrders = await _db.Orders.CountAsync(ct),
            ordersGrowth,
            totalCustomers,
            customersGrowth,
            avgOrderValue,
            avgGrowth = 0,
            pendingOrders,
            lowStockProducts,
            recentOrders
        });
    }

    /// <summary>Export orders as CSV</summary>
    [HttpGet("orders/export")]
    public async Task<IActionResult> ExportOrders([FromQuery] string? status, [FromQuery] string? from, [FromQuery] string? to, CancellationToken ct = default)
    {
        var query = _db.Orders.AsQueryable();
        if (!string.IsNullOrEmpty(status) && Enum.TryParse<Domain.Enums.OrderStatus>(status, out var statusEnum))
            query = query.Where(o => o.Status == statusEnum);
        if (DateTime.TryParse(from, out var fromDate)) query = query.Where(o => o.CreatedAt >= fromDate);
        if (DateTime.TryParse(to, out var toDate)) query = query.Where(o => o.CreatedAt <= toDate);

        var orders = await query.OrderByDescending(o => o.CreatedAt).Take(10000).ToListAsync(ct);

        var csv = new System.Text.StringBuilder();
        csv.AppendLine("Order Number,Customer,Email,Phone,Total,Status,Payment Status,District,Date");
        foreach (var o in orders)
        {
            csv.AppendLine($"{o.OrderNumber},{o.CustomerName},{o.CustomerEmail},{o.CustomerPhone},{o.Total},{o.Status},{o.PaymentStatus},{o.DeliveryAddress.District},{o.CreatedAt:yyyy-MM-dd HH:mm}");
        }

        return File(System.Text.Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", $"hampiee-orders-{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    /// <summary>Bulk status update for orders</summary>
    [HttpPost("orders/bulk-status")]
    public async Task<IActionResult> BulkUpdateStatus([FromBody] BulkStatusRequest req, CancellationToken ct = default)
    {
        var orders = await _db.Orders
            .Where(o => req.OrderNumbers.Contains(o.OrderNumber))
            .ToListAsync(ct);

        if (!Enum.TryParse<Domain.Enums.OrderStatus>(req.Status, out var status))
            return BadRequest("Invalid status");

        foreach (var order in orders)
            order.UpdateStatus(status, req.Notes);

        await _db.SaveChangesAsync(ct);
        return Ok(new { updated = orders.Count });
    }
}

public record BulkStatusRequest(string[] OrderNumbers, string Status, string? Notes);
