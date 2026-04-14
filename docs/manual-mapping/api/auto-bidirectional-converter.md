# AutoBidirectionalConverter\<TSrc, TDest\>

Reflection-assisted bidirectional converter. Both directions auto-map properties by name + assignment-compatible type; you only write expressions for fields that need custom logic in either direction.

```csharp
public abstract class AutoBidirectionalConverter<TSrc, TDest>
    : AutoTypeConverter<TSrc, TDest>, IBidirectionalConverter<TSrc, TDest>
```

## Inheritance Chain

```
ITypeConverter<TSrc, TDest>
  └─ TypeConverter<TSrc, TDest>
       └─ AutoTypeConverter<TSrc, TDest>
            │  CustomExpression()       — virtual, override for custom forward bindings
            │  AsExpression()           — sealed (auto + custom merged)
            │
            └─ AutoBidirectionalConverter<TSrc, TDest>
                 │  implements IBidirectionalConverter<TSrc, TDest>
                 │
                 │  CustomReverseExpression()  — virtual, override for custom reverse bindings
                 │  AsReverseExpression()      — returns built reverse expression
                 │  ConvertBack()              — virtual (compiles reverse expression)
                 │
                 └─ Your converter class
```

Note: `AutoBidirectionalConverter` does **not** extend `BidirectionalConverter` — it implements `IBidirectionalConverter` directly. This lets the reverse direction also benefit from the auto-mapping builder.

## Methods

Inherits `CustomExpression()`, `AsExpression()`, and `Convert()` from [`AutoTypeConverter`](./auto-type-converter). Adds:

### CustomReverseExpression()

```csharp
protected virtual Expression<Func<TDest, TSrc>>? CustomReverseExpression() => null;
```

**Virtual.** Override to bind fields that can't be auto-mapped in the reverse direction. Return `null` to auto-map everything. Same shape rules as `CustomExpression()`.

### AsReverseExpression()

```csharp
public Expression<Func<TDest, TSrc>> AsReverseExpression();
```

Returns the merged reverse expression (auto + optional custom). Cached via `Lazy<T>`.

### ConvertBack()

```csharp
public virtual TSrc ConvertBack(TDest source);
```

**Virtual.** Default compiles `AsReverseExpression()` and caches the delegate. Override for DI services or custom runtime logic in the reverse direction.

## Registration

Same as `BidirectionalConverter` — `CreateMap()` detects `IBidirectionalConverter` via `is` check and registers both directions in one call:

```csharp
cfg.CreateMap(new ProductAutoConverter());
// Both directions are now registered:
//   Product   → ProductDto   (via AsExpression / Convert)
//   ProductDto → Product     (via AsReverseExpression / ConvertBack)
```

## Examples

### Pure auto in both directions

If the two shapes mirror each other by name and type, no overrides are needed:

```csharp
public class ProductAutoConverter
    : AutoBidirectionalConverter<Product, ProductDto> { }
```

Forward and reverse are each a `MemberInit` of matching properties.

### Hybrid in both directions

The typical case: a few custom fields per direction, the rest auto:

```csharp
public class ProductAutoConverter
    : AutoBidirectionalConverter<Product, ProductDto>
{
    // Forward: Id + Price auto; DisplayName composed.
    protected override Expression<Func<Product, ProductDto>> CustomExpression() =>
        src => new ProductDto
        {
            DisplayName = src.Name + " [" + src.Category + "]"
        };

    // Reverse: Id + Price auto; Name extracted from DisplayName.
    protected override Expression<Func<ProductDto, Product>> CustomReverseExpression() =>
        src => new Product
        {
            Name = src.DisplayName
        };
}
```

### With DI services in `Convert` / `ConvertBack`

Let reflection handle the shape; use overrides for service-backed logic:

```csharp
public class UserAutoConverter
    : AutoBidirectionalConverter<User, UserDto>
{
    private readonly IEncryptionService _crypto;

    public UserAutoConverter(IEncryptionService crypto) => _crypto = crypto;

    // No custom expressions needed — all matching props auto-map.

    public override UserDto Convert(User src)
    {
        var dto = base.Convert(src);
        dto.Email = _crypto.Decrypt(dto.Email);
        return dto;
    }

    public override User ConvertBack(UserDto src)
    {
        var entity = base.ConvertBack(src);
        entity.Email = _crypto.Encrypt(entity.Email);
        return entity;
    }
}
```

`ProjectTo()` still returns raw email columns — the overrides don't affect the expression tree.

## Behavior Matrix

| Call site | Uses |
|---|---|
| `mapper.Map<TSrc, TDest>(src)` | `Convert()` — default compiles `AsExpression()` |
| `mapper.Map<TDest, TSrc>(dst)` | `ConvertBack()` — default compiles `AsReverseExpression()` |
| `db.Set<TSrc>().ProjectTo<TDest>(mapper)` | `AsExpression()` (auto + custom, merged) |
| Reverse `ProjectTo` (if EF-compatible) | `AsReverseExpression()` (auto + custom, merged) |

## When to Use

| Scenario | Prefer |
|---|---|
| Bidirectional mapping, most fields match by name | `AutoBidirectionalConverter` |
| Only forward mapping, most fields match | [`AutoTypeConverter`](./auto-type-converter) |
| Asymmetric shapes where almost nothing matches | [`BidirectionalConverter`](./bidirectional-converter) — auto gives no benefit |
| You need different `withProjectTo` settings per direction | Two separate `TypeConverter` classes |

## Caveats

- Same rules as [`AutoTypeConverter`](./auto-type-converter#caveats): shallow mapping, ordinal name match, no implicit enum/int conversion, no `Nullable<T> → T` unwrap.
- Reflection runs once per direction, lazily — no per-call cost.
- The forward and reverse builds are independent: skipping `CustomExpression()` does not affect `CustomReverseExpression()` and vice versa.
