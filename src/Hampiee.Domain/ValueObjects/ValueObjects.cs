namespace Hampiee.Domain.ValueObjects;

public record Money(decimal Amount, string Currency = "LKR")
{
    public static Money Zero => new(0);
    public Money Add(Money other)
    {
        if (Currency != other.Currency) throw new InvalidOperationException("Cannot add different currencies");
        return new Money(Amount + other.Amount, Currency);
    }
    public Money Subtract(Money other) => new(Math.Max(0, Amount - other.Amount), Currency);
    public Money MultiplyBy(int quantity) => new(Amount * quantity, Currency);
    public override string ToString() => $"LKR {Amount:N2}";
}

public record PhoneNumber(string Value)
{
    public static PhoneNumber Create(string phone)
    {
        var cleaned = new string(phone.Where(char.IsDigit).ToArray());
        if (cleaned.Length < 9 || cleaned.Length > 12)
            throw new ArgumentException("Invalid phone number format");
        return new PhoneNumber(cleaned);
    }

    public string Formatted => Value.Length == 10
        ? $"{Value[..3]} {Value[3..6]} {Value[6..]}"
        : Value;
}

public record EmailAddress(string Value)
{
    public static EmailAddress Create(string email)
    {
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
            throw new ArgumentException("Invalid email address");
        return new EmailAddress(email.ToLowerInvariant().Trim());
    }
}

public record SlugValue(string Value)
{
    public static SlugValue Create(string input)
    {
        var slug = input.ToLowerInvariant()
            .Replace(" ", "-")
            .Replace("_", "-");
        // Remove non-alphanumeric except hyphens
        slug = System.Text.RegularExpressions.Regex.Replace(slug, @"[^a-z0-9\-]", "");
        slug = System.Text.RegularExpressions.Regex.Replace(slug, @"-+", "-").Trim('-');
        return new SlugValue(slug);
    }
}
