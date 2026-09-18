using Hampiee.Application.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;

namespace Hampiee.Infrastructure.Storage;

/// <summary>Local filesystem storage for development</summary>
public class LocalStorageService : IStorageService
{
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _config;

    public LocalStorageService(IWebHostEnvironment env, IConfiguration config)
    {
        _env = env;
        _config = config;
    }

    public async Task<string> UploadAsync(Stream stream, string fileName, string contentType,
        string folder = "products", CancellationToken ct = default)
    {
        var uploadsPath = Path.Combine(_env.WebRootPath ?? "wwwroot", "uploads", folder);
        Directory.CreateDirectory(uploadsPath);

        var filePath = Path.Combine(uploadsPath, fileName);
        var dir = Path.GetDirectoryName(filePath)!;
        Directory.CreateDirectory(dir);

        using var fileStream = File.Create(filePath);
        await stream.CopyToAsync(fileStream, ct);

        return GetPublicUrl($"uploads/{folder}/{fileName}");
    }

    public Task DeleteAsync(string url, CancellationToken ct = default)
    {
        // Extract relative path and delete file
        var baseUrl = _config["Storage:BaseUrl"] ?? "";
        var relativePath = url.Replace(baseUrl + "/", "");
        var fullPath = Path.Combine(_env.WebRootPath ?? "wwwroot", relativePath.Replace('/', Path.DirectorySeparatorChar));
        if (File.Exists(fullPath)) File.Delete(fullPath);
        return Task.CompletedTask;
    }

    public string GetPublicUrl(string path)
        => $"{_config["Storage:BaseUrl"]}/{path.TrimStart('/')}";
}
