namespace Hampiee.Domain.Entities;

/// <summary>Registered customer with address book and wishlist</summary>
public class Customer : BaseEntity
{
    public string FirstName { get; private set; } = string.Empty;
    public string LastName { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public string? Phone { get; private set; }
    public string? AvatarUrl { get; private set; }
    public bool EmailVerified { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime? LastLoginAt { get; private set; }
    public string? Notes { get; private set; } // Admin notes

    private readonly List<Address> _addresses = [];
    public IReadOnlyCollection<Address> Addresses => _addresses.AsReadOnly();

    private readonly List<WishlistItem> _wishlist = [];
    public IReadOnlyCollection<WishlistItem> Wishlist => _wishlist.AsReadOnly();

    private Customer() { }

    public static Customer Create(string firstName, string lastName, string email, string? phone = null)
        => new() { FirstName = firstName, LastName = lastName, Email = email, Phone = phone };

    public string FullName => $"{FirstName} {LastName}";

    public void UpdateProfile(string firstName, string lastName, string? phone)
    {
        FirstName = firstName;
        LastName = lastName;
        Phone = phone;
        MarkUpdated();
    }

    public void AddAddress(Address address) { _addresses.Add(address); MarkUpdated(); }
    public void RemoveAddress(Guid addressId) { _addresses.RemoveAll(a => a.Id == addressId); MarkUpdated(); }

    public void AddToWishlist(Guid? productId, Guid? hamperId)
    {
        if (_wishlist.Any(w => w.ProductId == productId && w.HamperId == hamperId)) return;
        _wishlist.Add(new WishlistItem { CustomerId = Id, ProductId = productId, HamperId = hamperId });
        MarkUpdated();
    }

    public void RemoveFromWishlist(Guid itemId) { _wishlist.RemoveAll(w => w.Id == itemId); MarkUpdated(); }

    public void RecordLogin() { LastLoginAt = DateTime.UtcNow; MarkUpdated(); }
    public void VerifyEmail() { EmailVerified = true; MarkUpdated(); }
    public void Deactivate() { IsActive = false; MarkUpdated(); }
}

public class Address
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid? CustomerId { get; init; }
    public string Label { get; init; } = "Home"; // Home / Work / Other
    public string RecipientName { get; init; } = string.Empty;
    public string RecipientPhone { get; init; } = string.Empty;
    public string Line1 { get; init; } = string.Empty;
    public string? Line2 { get; init; }
    public string City { get; init; } = string.Empty;
    public string District { get; init; } = string.Empty;
    public string? PostalCode { get; init; }
    public bool IsDefault { get; set; }
}

public class WishlistItem
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid CustomerId { get; init; }
    public Guid? ProductId { get; init; }
    public Guid? HamperId { get; init; }
    public DateTime AddedAt { get; init; } = DateTime.UtcNow;
}
