using Hampiee.Application.Services;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

namespace Hampiee.Infrastructure.Cache;

public class RedisCacheService : ICacheService
{
    private readonly IDistributedCache _cache;

    public RedisCacheService(IDistributedCache cache) => _cache = cache;

    public async Task<T?> GetAsync<T>(string key, CancellationToken ct = default)
    {
        var raw = await _cache.GetStringAsync(key, ct);
        return raw == null ? default : JsonSerializer.Deserialize<T>(raw);
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expiry = null, CancellationToken ct = default)
    {
        var options = new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = expiry ?? TimeSpan.FromMinutes(10)
        };
        await _cache.SetStringAsync(key, JsonSerializer.Serialize(value), options, ct);
    }

    public async Task RemoveAsync(string key, CancellationToken ct = default)
        => await _cache.RemoveAsync(key, ct);

    public async Task RemoveByPatternAsync(string pattern, CancellationToken ct = default)
    {
        // Redis pattern removal via StackExchange.Redis direct access for pattern matching
        // For distributed cache abstraction, we'll log for now — implement with ConnectionMultiplexer if needed
        // In production: inject IConnectionMultiplexer and use SCAN + DEL
        await Task.CompletedTask;
    }
}
