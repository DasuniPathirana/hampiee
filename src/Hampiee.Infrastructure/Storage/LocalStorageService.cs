using Hampiee.Application.Services;
using Microsoft.Extensions.Configuration;

namespace Hampiee.Infrastructure.Storage;

/// <summary>Local filesystem storage for development — stores files in wwwroot/uploads</summary>
public class LocalStorageService : IStorageService
{
    private readonly IConfiguration _config;
    private readonly string _rootPath;

    public LocalStorageService(IConfiguration config)
    {
        _config = config;
        // Default to wwwroot under working directory if not configured
        _rootPath = config["Storage:LocalPath"] ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
    }

    public async Task<string> UploadAsync(Stream stream, string fileName, string contentType,
        string folder = "products", CancellationToken ct = default)
    {
        var uploadsPath = Path.Combine(_rootPath, "uploads", folder);
        Directory.CreateDirectory(uploadsPath);

        var safeName = Path.GetFileName(fileName); // prevent path traversal
        var filePath = Path.Combine(uploadsPath, safeName);

        using var fileStream = File.Create(filePath);
        await stream.CopyToAsync(fileStream, ct);

        return GetPublicUrl($"uploads/{folder}/{safeName}");
    }

    public Task DeleteAsync(string url, CancellationToken ct = default)
    {
        var baseUrl = _config["Storage:BaseUrl"] ?? "";
        var relativePath = url.Replace(baseUrl + "/", "").Replace('/', Path.DirectorySeparatorChar);
        var fullPath = Path.Combine(_rootPath, relativePath);
        if (File.Exists(fullPath)) File.Delete(fullPath);
        return Task.CompletedTask;
    }

    public string GetPublicUrl(string path)
        => $"{_config["Storage:BaseUrl"]}/{path.TrimStart('/')}";
}
