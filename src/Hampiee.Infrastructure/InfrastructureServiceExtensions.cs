using Hampiee.Application.Services;
using Hampiee.Domain.Repositories;
using Hampiee.Infrastructure.Cache;
using Hampiee.Infrastructure.Email;
using Hampiee.Infrastructure.Payments;
using Hampiee.Infrastructure.Persistence;
using Hampiee.Infrastructure.Persistence.Repositories;
using Hampiee.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SendGrid.Extensions.DependencyInjection;

namespace Hampiee.Infrastructure;

/// <summary>Dependency injection extension — call from Program.cs</summary>
public static class InfrastructureServiceExtensions
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        // ── Database ─────────────────────────────────────────────────────────
        services.AddDbContext<HampieeDbContext>(opts =>
            opts.UseNpgsql(
                config.GetConnectionString("DefaultConnection"),
                npg => npg.MigrationsAssembly("Hampiee.Infrastructure")
                          .EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), null)));

        // ── Repositories ─────────────────────────────────────────────────────
        services.AddScoped<IProductRepository, ProductRepository>();
        services.AddScoped<IHamperRepository, HamperRepository>();
        services.AddScoped<IOrderRepository, OrderRepository>();
        services.AddScoped<ICustomerRepository, CustomerRepository>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<IPromotionRepository, PromotionRepository>();
        services.AddScoped<IDeliveryZoneRepository, DeliveryZoneRepository>();
        services.AddScoped<ICmsBlockRepository, CmsBlockRepository>();

        // ── Cache (Redis) ─────────────────────────────────────────────────────
        services.AddStackExchangeRedisCache(opts =>
            opts.Configuration = config.GetConnectionString("Redis"));
        services.AddScoped<ICacheService, RedisCacheService>();

        // ── Payments ──────────────────────────────────────────────────────────
        services.AddHttpClient<PayHerePaymentService>();
        services.AddScoped<IPaymentService, PayHerePaymentService>();

        // ── Email ─────────────────────────────────────────────────────────────
        services.AddSendGrid(opts => opts.ApiKey = config["SendGrid:ApiKey"] ?? "");
        services.AddScoped<IEmailService, SendGridEmailService>();

        // ── Storage ───────────────────────────────────────────────────────────
        var storageProvider = config["Storage:Provider"] ?? "Local";
        if (storageProvider == "GCS")
        {
            // TODO: Register GCS implementation when deploying to GCP
            services.AddScoped<IStorageService, LocalStorageService>();
        }
        else
        {
            services.AddScoped<IStorageService, LocalStorageService>();
        }

        return services;
    }
}
