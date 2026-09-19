using Hampiee.API.Middleware;
using Hampiee.Infrastructure;
using Hampiee.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Serilog.Events;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.EntityFrameworkCore;


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

    // ─── Infrastructure (DB, Repos, Cache, Payment, Email, Storage) ─────────────
    builder.Services.AddInfrastructure(builder.Configuration);

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
        opts.GlobalLimiter = System.Threading.RateLimiting.PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
            System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
                ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
                {
                    Window = TimeSpan.FromMinutes(1),
                    PermitLimit = 100,
                    QueueLimit = 0
                }));
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
        cfg.RegisterServicesFromAssembly(typeof(Hampiee.Application.AssemblyReference).Assembly));

    // ─── Infrastructure (DB, Redis, Payments, Email, Storage) ───────────────────
    builder.Services.AddInfrastructure(builder.Configuration);

    // ─── SignalR ─────────────────────────────────────────────────────────────────
    builder.Services.AddSignalR();

    // ─── Controllers + Swagger ──────────────────────────────────────────────────
    builder.Services.AddControllers();
    builder.Services.AddEndpointsApiExplorer();
    // Simple Swagger docs - JWT can be added manually in UI via Authorize button
    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new() { Title = "Hampiee API", Version = "v1" });
    });

    // ─── Health Checks ───────────────────────────────────────────────────────────
    builder.Services.AddHealthChecks();

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
