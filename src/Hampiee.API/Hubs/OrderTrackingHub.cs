using Microsoft.AspNetCore.SignalR;

namespace Hampiee.API.Hubs;

/// <summary>Real-time order tracking hub using SignalR</summary>
public class OrderTrackingHub : Hub
{
    private readonly ILogger<OrderTrackingHub> _logger;

    public OrderTrackingHub(ILogger<OrderTrackingHub> logger) => _logger = logger;

    public async Task SubscribeToOrder(string orderNumber)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"order-{orderNumber}");
        _logger.LogInformation("Client {ConnectionId} subscribed to order {OrderNumber}",
            Context.ConnectionId, orderNumber);
    }

    public async Task UnsubscribeFromOrder(string orderNumber)
        => await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"order-{orderNumber}");

    public override async Task OnConnectedAsync()
    {
        _logger.LogDebug("SignalR client connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogDebug("SignalR client disconnected: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }
}
