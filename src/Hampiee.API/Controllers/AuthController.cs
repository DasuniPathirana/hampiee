using Hampiee.Application.Services;
using Hampiee.Domain.Entities;
using Hampiee.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace Hampiee.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _config;
    private readonly HampieeDbContext _db;

    public AuthController(UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager,
        IEmailService emailService, IConfiguration config, HampieeDbContext db)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _emailService = emailService;
        _config = config;
        _db = db;
    }

    /// <summary>Register new customer account</summary>
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser != null)
            return Conflict(new { message = "Email already registered" });

        var user = new ApplicationUser
        {
            Email = request.Email,
            UserName = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName,
            Role = "Customer"
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        await _userManager.AddToRoleAsync(user, "Customer");

        // Create Customer record
        var customer = Customer.Create(request.FirstName, request.LastName, request.Email, request.Phone);
        _db.Customers.Add(customer);
        user.CustomerId = customer.Id;
        await _db.SaveChangesAsync();
        await _userManager.UpdateAsync(user);

        await _emailService.SendWelcomeEmailAsync(user.Email!, user.FullName);

        var tokens = await GenerateTokensAsync(user);
        return Ok(tokens);
    }

    /// <summary>Login with email and password</summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null || !user.IsActive(user))
            return Unauthorized(new { message = "Invalid email or password" });

        var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (!result.Succeeded)
        {
            if (result.IsLockedOut)
                return StatusCode(429, new { message = "Account locked due to too many failed attempts. Try again in 5 minutes." });
            return Unauthorized(new { message = "Invalid email or password" });
        }

        var tokens = await GenerateTokensAsync(user);
        return Ok(tokens);
    }

    /// <summary>Refresh access token using refresh token</summary>
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request)
    {
        var principal = GetPrincipalFromExpiredToken(request.AccessToken);
        if (principal == null)
            return BadRequest(new { message = "Invalid access token" });

        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _userManager.FindByIdAsync(userId!);
        if (user == null)
            return Unauthorized(new { message = "User not found" });

        // Validate refresh token (store in Redis in production)
        var storedToken = await _userManager.GetAuthenticationTokenAsync(user, "RefreshTokens", "RefreshToken");
        if (storedToken != request.RefreshToken)
            return Unauthorized(new { message = "Invalid refresh token" });

        var tokens = await GenerateTokensAsync(user);
        return Ok(tokens);
    }

    /// <summary>Logout — invalidates refresh token</summary>
    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] RefreshRequest request)
    {
        var principal = GetPrincipalFromExpiredToken(request.AccessToken);
        if (principal != null)
        {
            var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
            var user = await _userManager.FindByIdAsync(userId!);
            if (user != null)
                await _userManager.RemoveAuthenticationTokenAsync(user, "RefreshTokens", "RefreshToken");
        }
        return Ok(new { message = "Logged out successfully" });
    }

    /// <summary>Request password reset email</summary>
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null) return Ok(); // Don't reveal if email exists

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var encodedToken = Uri.EscapeDataString(token);
        var resetLink = $"{_config["AppUrl"]}/reset-password?token={encodedToken}&email={request.Email}";
        await _emailService.SendPasswordResetAsync(user.Email!, resetLink);
        return Ok(new { message = "If this email is registered, you will receive a reset link" });
    }

    /// <summary>Reset password with token</summary>
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null) return BadRequest(new { message = "Invalid request" });

        var result = await _userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        return Ok(new { message = "Password reset successfully" });
    }

    private async Task<AuthResponse> GenerateTokensAsync(ApplicationUser user)
    {
        var roles = await _userManager.GetRolesAsync(user);
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email!),
            new(ClaimTypes.Name, user.FullName),
            new("customerId", user.CustomerId?.ToString() ?? ""),
            new("role", user.Role)
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiry = DateTime.UtcNow.AddMinutes(_config.GetValue<int>("Jwt:AccessTokenExpiryMinutes", 60));

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: expiry,
            signingCredentials: credentials);

        var accessToken = new JwtSecurityTokenHandler().WriteToken(token);

        // Generate secure refresh token
        var refreshToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        await _userManager.SetAuthenticationTokenAsync(user, "RefreshTokens", "RefreshToken", refreshToken);

        return new AuthResponse(accessToken, refreshToken, expiry, user.Email!, user.FullName, user.Role,
            roles.ToList(), user.CustomerId);
    }

    private ClaimsPrincipal? GetPrincipalFromExpiredToken(string token)
    {
        try
        {
            var handler = new JwtSecurityTokenHandler();
            var validation = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!)),
                ValidateIssuer = true,
                ValidIssuer = _config["Jwt:Issuer"],
                ValidateAudience = true,
                ValidAudience = _config["Jwt:Audience"],
                ValidateLifetime = false // Allow expired tokens for refresh
            };
            return handler.ValidateToken(token, validation, out _);
        }
        catch { return null; }
    }
}

file static class ApplicationUserExtensions
{
    public static bool IsActive(this ApplicationUser _, ApplicationUser user) => !user.LockoutEnd.HasValue || user.LockoutEnd < DateTimeOffset.UtcNow;
}

// ─── Request/Response DTOs ────────────────────────────────────────────────────

public record RegisterRequest(string FirstName, string LastName, string Email, string Password, string? Phone);
public record LoginRequest(string Email, string Password);
public record RefreshRequest(string AccessToken, string RefreshToken);
public record ForgotPasswordRequest(string Email);
public record ResetPasswordRequest(string Email, string Token, string NewPassword);
public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    string Email,
    string FullName,
    string Role,
    List<string> Roles,
    Guid? CustomerId);
