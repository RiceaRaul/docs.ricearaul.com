# AutoTypeConverter\<TSrc, TDest\>

Reflection-assisted variant of [`TypeConverter`](./type-converter). Destination properties with a matching source property (same name, assignment-compatible type) are mapped automatically; you only write expressions for the fields that need custom logic.

```csharp
public abstract class AutoTypeConverter<TSrc, TDest> : TypeConverter<TSrc, TDest>
```

## How It Works

Reflection runs **once**, lazily, on first access to `AsExpression()`. It builds a single `MemberInit` expression tree by:

1. Taking the optional `CustomExpression()` you provide (if any)
2. Extracting its bindings as "explicitly mapped" fields
3. Scanning `TDest` for writable public properties not already bound
4. For each, looking up a same-named readable property on `TSrc`
5. Adding `destProp = srcProp` bindings when types are assignment-compatible (or `T → Nullable<T>`)

The result is a single expression tree — no per-call reflection, no runtime scanning. `ProjectTo()` still translates to SQL with individual columns.

```
┌─────────────────────────────────────────────────────────┐
│                AutoMapExpressionBuilder                  │
│                                                         │
│   CustomExpression()  →  bindings [DisplayName = ...]   │
│                               │                         │
│                               ▼                         │
│   Reflection scan TDest, skip explicitly-mapped         │
│                               │                         │
│                               ▼                         │
│   Append bindings for matching TSrc props               │
│                               │                         │
│                               ▼                         │
│   Expression<Func<TSrc, TDest>>                         │
│        │                       │                        │
│        ▼                       ▼                        │
│   Compile (for Map)       EF translate (ProjectTo)      │
└─────────────────────────────────────────────────────────┘
```

## Methods

### CustomExpression()

```csharp
protected virtual Expression<Func<TSrc, TDest>>? CustomExpression() => null;
```

**Virtual.** Override to bind fields that can't be auto-mapped (name mismatch, computed values, concatenation, navigation). Return `null` (or don't override) to auto-map every matching field.

The expression **must** be of the form `src => new TDest { ... }` using the parameterless constructor. Any other shape throws `InvalidOperationException` at build time.

**Explicit bindings always win.** A field bound in `CustomExpression()` is never overwritten by reflection.

### AsExpression()

```csharp
public sealed override Expression<Func<TSrc, TDest>> AsExpression();
```

**Sealed.** Returns the merged expression. Override `CustomExpression()` instead.

### Convert()

Inherited from [`TypeConverter.Convert()`](./type-converter#convert). Still `virtual` — override for DI services or custom runtime logic. The auto-built expression is only used by the default `Convert()` (via `Lazy<Compile>`) and by `ProjectTo()`.

## Type Matching Rules

A destination property is auto-mapped from a source property when:

| Rule | Example |
|---|---|
| Same name (ordinal, case-sensitive) | `src.Id → dest.Id` |
| Same type | `int → int` |
| Derived to base (`IsAssignableFrom`) | `Customer → Person`, `string → object` |
| `T → Nullable<T>` | `int → int?` |

Not auto-mapped:
- Different names (`Name` vs `DisplayName`) — bind in `CustomExpression()`
- `Nullable<T> → T` — unsafe unwrap, handle in `CustomExpression()`
- Different types with no implicit conversion — bind in `CustomExpression()`
- Non-writable destination properties — skipped silently

## Examples

### Pure auto-mapping

When the DTO mirrors the entity exactly, `CustomExpression()` isn't needed:

```csharp
public class ProductAutoConverter : AutoTypeConverter<Product, ProductDto> { }

// All matching fields are mapped by reflection
cfg.CreateMap(new ProductAutoConverter());
```

### Hybrid (custom + auto)

Write only the fields that can't be auto-mapped; the rest come from reflection:

```csharp
public class ProductAutoConverter : AutoTypeConverter<Product, ProductDto>
{
    // Id + Price auto-map by reflection.
    // DisplayName needs composition → custom.
    // TagsSummary has no matching source prop → left as default.
    protected override Expression<Func<Product, ProductDto>> CustomExpression() =>
        src => new ProductDto
        {
            DisplayName = src.Name + " [" + src.Category + "]"
        };
}
```

Effective expression built at runtime:

```csharp
src => new ProductDto
{
    DisplayName = src.Name + " [" + src.Category + "]",  // custom
    Id          = src.Id,                                // auto
    Price       = src.Price                              // auto
}
```

### Combining with `Convert()` override

Auto-build the expression, then layer DI logic on top in `Convert()`:

```csharp
public class ProductAutoConverter : AutoTypeConverter<Product, ProductDto>
{
    private readonly IPricingService _pricing;

    public ProductAutoConverter(IPricingService pricing) => _pricing = pricing;

    protected override Expression<Func<Product, ProductDto>> CustomExpression() =>
        src => new ProductDto
        {
            DisplayName = src.Name + " [" + src.Category + "]"
        };

    // Compiled auto+custom expression handles Id/Price/DisplayName;
    // then patch in-memory results with the injected service.
    public override ProductDto Convert(Product src)
    {
        var dto = base.Convert(src);
        dto.Price = _pricing.ApplyDiscount(dto.Price);
        return dto;
    }
}
```

- `Map()` — uses `Convert()` (discount applied)
- `ProjectTo()` — uses the auto-built expression (no discount, since services can't run in SQL)

## Registration

Identical to `TypeConverter`:

```csharp
cfg.CreateMap(new ProductAutoConverter());                              // fluent
cfg.CreateMap<Product, ProductDto, ProductAutoConverter>(sp);           // via DI
cfg.CreateMap(new ProductAutoConverter(), withProjectTo: false);        // Map-only
```

## When to Use

| Scenario | Prefer |
|---|---|
| DTO fields mostly match entity by name/type | `AutoTypeConverter` |
| Every field is computed or renamed | `TypeConverter` — auto gives no benefit |
| You want full control over the expression shape | `TypeConverter` |
| You need bidirectional auto-mapping | [`AutoBidirectionalConverter`](./auto-bidirectional-converter) |

## Performance Notes

- Reflection runs **once** per converter, on first access (via `Lazy<T>`)
- The resulting expression is cached and compiled exactly like a hand-written one
- No difference at the call site between `TypeConverter` and `AutoTypeConverter` after warm-up
- Build-time cost scales with the number of destination properties (tiny)

## Caveats

- Auto-mapping is **shallow**: a nested `Address → AddressDto` won't be recursively resolved via another registered mapping. Bind nested objects in `CustomExpression()` explicitly, or use a hand-written `TypeConverter`.
- Enums don't implicitly convert to `int` (or vice versa) — bind explicitly if needed.
- Property name matching is ordinal and case-sensitive (`name` ≠ `Name`).
- If the custom expression's body isn't a `new TDest { ... }` with a parameterless constructor, build throws `InvalidOperationException`.
