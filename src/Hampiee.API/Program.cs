using Hampiee.API.Middleware;
using Hampiee.Infrastructure.Payments;
using Hampiee.Infrastructure.Persistence;
using Hampiee.Application.Services;
using Hampiee.Infrastructure.Email;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Serilog.Events;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.OpenApi.Models;
using SendGrid.Extensions.DependencyInjection;

// Bootstrap Serilog early
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Information)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    // ─── Serilog ────────────────────────────────────────────────────────────────
    builder.Host.UseSerilog((ctx, services, cfg) =>
        cfg.ReadFrom.Configuration(ctx.Configuration)
           .ReadFrom.Services(services)
           .Enrich.FromLogContext()
           .WriteTo.Console());

    // ─── Database ───────────────────────────────────────────────────────────────
    builder.Services.AddDbContext<HampieeDbContext>(opts =>
        opts.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"),
            npg => npg.MigrationsAssembly("Hampiee.Infrastructure")));

    // ─── Identity ───────────────────────────────────────────────────────────────
    builder.Services.AddIdentity<ApplicationUser, IdentityRole<Guid>>(opts =>
    {
        opts.Password.RequiredLength = 8;
        opts.Password.RequireUppercase = true;
        opts.Password.RequireDigit = true;
        opts.Password.RequireNonAlphanumeric = true;
        opts.User.RequireUniqueEmail = true;
        opts.SignIn.RequireConfirmedEmail = false; // Enable in production
    })
    .AddEntityFrameworkStores<HampieeDbContext>()
    .AddDefaultTokenProviders();

    // ─── JWT Authentication ──────────────────────────────────────────────────────
    var jwtKey = builder.Configuration["Jwt:Key"]
        ?? throw new InvalidOperationException("JWT Key not configured");

    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(opts =>
        {
            opts.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                ValidateIssuer = true,
                ValidIssuer = builder.Configuration["Jwt:Issuer"],
                ValidateAudience = true,
                ValidAudience = builder.Configuration["Jwt:Audience"],
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };
        });

    builder.Services.AddAuthorization(opts =>
    {
        opts.AddPolicy("AdminOnly", p => p.RequireRole("Admin", "SuperAdmin"));
        opts.AddPolicy("StaffOrAdmin", p => p.RequireRole("Staff", "Admin", "SuperAdmin"));
    });

    // ─── Rate Limiting ───────────────────────────────────────────────────────────
    builder.Services.AddRateLimiter(opts =>
    {
        opts.AddFixedWindowLimiter("api", cfg =>
        {
            cfg.Window = TimeSpan.FromMinutes(1);
            cfg.PermitLimit = 100;
            cfg.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
            cfg.QueueLimit = 10;
        });

        opts.AddFixedWindowLimiter("auth", cfg =>
        {
            cfg.Window = TimeSpan.FromMinutes(5);
            cfg.PermitLimit = 10;
        });

        opts.AddFixedWindowLimiter("payment-notify", cfg =>
        {
            cfg.Window = TimeSpan.FromMinutes(1);
            cfg.PermitLimit = 50;
        });

        opts.RejectionStatusCode = 429;
    });

    // ─── CORS ────────────────────────────────────────────────────────────────────
    builder.Services.AddCors(opts =>
    {
        opts.AddPolicy("hampiee-cors", policy =>
        {
            var origins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
                ?? ["http://localhost:4200", "http://localhost:4300"];
            policy.WithOrigins(origins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
    });

    // ─── MediatR ────────────────────────────────────────────────────────────────
    builder.Services.AddMediatR(cfg =>
        cfg.RegisterServicesFromAssemblyContaining<Hampiee.Application.AssemblyReference>());

    // ─── Application Services ────────────────────────────────────────────────────
    builder.Services.AddHttpClient<PayHerePaymentService>();
    builder.Services.AddScoped<IPaymentService, PayHerePaymentService>();

    builder.Services.AddSendGrid(opts =>
        opts.ApiKey = builder.Configuration["SendGrid:ApiKey"] ?? "");
    builder.Services.AddScoped<IEmailService, SendGridEmailService>();

    // ─── Cache (Redis) ───────────────────────────────────────────────────────────
    builder.Services.AddStackExchangeRedisCache(opts =>
        opts.Configuration = builder.Configuration.GetConnectionString("Redis"));

    // ─── SignalR (real-time order tracking) ─────────────────────────────────────
    builder.Services.AddSignalR();

    // ─── Controllers + Swagger ──────────────────────────────────────────────────
    builder.Services.AddControllers();
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo
        {
            Title = "Hampiee API",
            Version = "v1",
            Description = "Premium Sri Lankan Gifting Platform API"
        });
        c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            Description = "Enter JWT token"
        });
        c.AddSecurityRequirement(new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
                []
            }
        });
    });

    // ─── Health Checks ───────────────────────────────────────────────────────────
    builder.Services.AddHealthChecks()
        .AddDbContextCheck<HampieeDbContext>("database");

    var app = builder.Build();

    // ─── Middleware Pipeline ─────────────────────────────────────────────────────

    // Security headers
    app.Use(async (context, next) =>
    {
        context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
        context.Response.Headers.Append("X-Frame-Options", "DENY");
        context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
        context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
        context.Response.Headers.Append("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
        if (!app.Environment.IsDevelopment())
            context.Response.Headers.Append("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
        await next();
    });

    app.UseSerilogRequestLogging();

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Hampiee API v1"));
    }

    app.UseHttpsRedirection();
    app.UseCors("hampiee-cors");
    app.UseRateLimiter();
    app.UseAuthentication();
    app.UseAuthorization();
    app.UseMiddleware<ExceptionHandlingMiddleware>();

    app.MapControllers();
    app.MapHub<Hampiee.API.Hubs.OrderTrackingHub>("/hubs/orders");
    app.MapHealthChecks("/health");

    // Auto-migrate on startup (dev only)
    if (app.Environment.IsDevelopment())
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HampieeDbContext>();
        await db.Database.MigrateAsync();
    }

    Log.Information("🎁 Hampiee API starting on {Env}", app.Environment.EnvironmentName);
    await app.RunAsync();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Hampiee API terminated unexpectedly");
}
finally
{
    await Log.CloseAndFlushAsync();
}
