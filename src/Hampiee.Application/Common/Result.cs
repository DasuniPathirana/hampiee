namespace Hampiee.Application.Common;

/// <summary>Standard result wrapper for use cases</summary>
public class Result<T>
{
    public bool IsSuccess { get; private set; }
    public T? Value { get; private set; }
    public string? Error { get; private set; }
    public string? ErrorCode { get; private set; }

    private Result() { }

    public static Result<T> Success(T value) => new() { IsSuccess = true, Value = value };
    public static Result<T> Failure(string error, string? code = null) => new() { IsSuccess = false, Error = error, ErrorCode = code };
}

public class Result
{
    public bool IsSuccess { get; private set; }
    public string? Error { get; private set; }
    public string? ErrorCode { get; private set; }

    public static Result Success() => new() { IsSuccess = true };
    public static Result Failure(string error, string? code = null) => new() { IsSuccess = false, Error = error, ErrorCode = code };
}

/// <summary>Paginated response wrapper</summary>
public record PagedResult<T>(
    IEnumerable<T> Items,
    int TotalCount,
    int Page,
    int PageSize)
{
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    public bool HasNextPage => Page < TotalPages;
    public bool HasPrevPage => Page > 1;
}
