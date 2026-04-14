# BidirectionalConverter\<TSrc, TDest\>

Extends `TypeConverter<TSrc, TDest>` with reverse mapping. A single `CreateMap()` call registers both `TSrc → TDest` and `TDest → TSrc`.

```csharp
public abstract class BidirectionalConverter<TSrc, TDest>
    : TypeConverter<TSrc, TDest>, IBidirectionalConverter<TSrc, TDest>
```

## Inheritance Chain

```
ITypeConverter<TSrc, TDest>
  └─ TypeConverter<TSrc, TDest>
       │  AsExpression()        — abstract
       │  Convert()             — virtual (compiles AsExpression)
       │
       └─ BidirectionalConverter<TSrc, TDest>
            │  implements IBidirectionalConverter<TSrc, TDest>
            │
            │  AsReverseExpression()  — abstract
            │  ConvertBack()          — virtual (compiles AsReverseExpression)
            │
            └─ Your converter class
```

## Methods

Inherits `AsExpression()` and `Convert()` from `TypeConverter`. Adds:

### AsReverseExpression()

```csharp
public abstract Expression<Func<TDest, TSrc>> AsReverseExpression();
```

**Abstract — must implement.** Returns the reverse expression tree (`TDest → TSrc`).

Same rules as `AsExpression()` — must be EF-translatable if you want `ProjectTo()` in the reverse direction.

---

### ConvertBack()

```csharp
public virtual TSrc ConvertBack(TDest source);
```

**Virtual.** By default, compiles `AsReverseExpression()` via `Lazy<Func<TDest, TSrc>>`.

Override for DI services or custom logic in the reverse direction.

## How Registration Works

When you call `CreateMap()` with a `BidirectionalConverter`, the mapper detects it via an `is` check and registers both directions automatically:

```csharp
// Internal — what CreateMap() does for a BidirectionalConverter
public MapperConfiguration CreateMap<TSrc, TDest>(TypeConverter<TSrc, TDest> converter, ...)
{
    // Always register forward
    _delegates[(typeof(TSrc), typeof(TDest))] = converter.Convert;

    // If bidirectional, also register reverse
    if (converter is IBidirectionalConverter<TSrc, TDest> bidir)
    {
        _delegates[(typeof(TDest), typeof(TSrc))] = bidir.ConvertBack;
        // + expressions for both directions
    }
}
```

This means one call does two registrations:

```csharp
cfg.CreateMap(new ProductConverter());

// Now both work:
mapper.Map<Product, ProductDto>(product);     // forward  — Convert()
mapper.Map<ProductDto, Product>(dto);         // reverse  — ConvertBack()

// ProjectTo works both ways too:
db.Products.ProjectTo<ProductDto>(mapper);    // forward expression
// Reverse ProjectTo is available if the reverse expression is EF-compatible
```

## Examples

### Basic Bidirectional

```csharp
public class ProductConverter : BidirectionalConverter<Product, ProductDto>
{
    public override Expression<Func<Product, ProductDto>> AsExpression() =>
        src => new ProductDto
        {
            Id          = src.Id,
            DisplayName = src.Name + " [" + src.Category + "]",
            Price       = src.Price
        };

    public override Expression<Func<ProductDto, Product>> AsReverseExpression() =>
        src => new Product
        {
            Id    = src.Id,
            Name  = src.DisplayName,
            Price = src.Price
        };
}
```

### Asymmetric Mapping

Forward and reverse don't need to be symmetric. Common when the DTO is a simplified view:

```csharp
public class UserConverter : BidirectionalConverter<User, UserDto>
{
    // Forward: flatten nested Address into DTO
    public override Expression<Func<User, UserDto>> AsExpression() =>
        src => new UserDto
        {
            Id       = src.Id,
            FullName = src.FirstName + " " + src.LastName,
            City     = src.Address != null ? src.Address.City : "",
            Email    = src.Email
        };

    // Reverse: can't reconstruct Address from City string alone
    // Only map what's possible
    public override Expression<Func<UserDto, User>> AsReverseExpression() =>
        src => new User
        {
            Id        = src.Id,
            FirstName = src.FullName, // best effort — can't split
            Email     = src.Email
        };
}
```

### With DI Services

Override both `Convert()` and `ConvertBack()` to use injected services:

```csharp
public class UserConverter : BidirectionalConverter<User, UserDto>
{
    private readonly IEncryptionService _crypto;

    public UserConverter(IEncryptionService crypto) => _crypto = crypto;

    // Expressions — EF-translatable, no service calls
    public override Expression<Func<User, UserDto>> AsExpression() =>
        src => new UserDto { Id = src.Id, Email = src.Email };

    public override Expression<Func<UserDto, User>> AsReverseExpression() =>
        src => new User { Id = src.Id, Email = src.Email };

    // Overrides — use injected service for in-memory mapping
    public override UserDto Convert(User source) => new()
    {
        Id    = source.Id,
        Email = _crypto.Decrypt(source.EncryptedEmail)
    };

    public override User ConvertBack(UserDto source) => new()
    {
        Id             = source.Id,
        EncryptedEmail = _crypto.Encrypt(source.Email)
    };
}
```

This gives four distinct behaviors from one converter:

| Call | Method | Service |
|---|---|---|
| `mapper.Map<User, UserDto>(user)` | `Convert()` | Decrypts email |
| `mapper.Map<UserDto, User>(dto)` | `ConvertBack()` | Encrypts email |
| `db.Users.ProjectTo<UserDto>(mapper)` | `AsExpression()` | Raw email from DB |
| (reverse ProjectTo if needed) | `AsReverseExpression()` | Raw email |

### Validation in ConvertBack

Use the override to validate incoming DTOs before converting to entities:

```csharp
public override User ConvertBack(UserDto source)
{
    if (string.IsNullOrWhiteSpace(source.Email))
        throw new ArgumentException("Email is required");

    if (!source.Email.Contains('@'))
        throw new ArgumentException("Invalid email format");

    return new User
    {
        Id    = source.Id,
        Email = source.Email.Trim().ToLowerInvariant()
    };
}
```

## When to Use Bidirectional vs Two TypeConverters

| Scenario | Use |
|---|---|
| Forward and reverse are closely related | `BidirectionalConverter` — single file, single registration |
| Forward and reverse have completely different dependencies | Two separate `TypeConverter` classes |
| Only need forward mapping | `TypeConverter` |
| Need different `withProjectTo` settings per direction | Two separate `TypeConverter` classes |
| Most fields match by name+type across both directions | [`AutoBidirectionalConverter`](./auto-bidirectional-converter) — reflection fills in matching fields, you write only the exceptions |
