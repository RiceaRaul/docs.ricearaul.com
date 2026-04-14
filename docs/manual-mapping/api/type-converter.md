# TypeConverter\<TSrc, TDest\>

Base class for one-way converters. Inherit from this to define a mapping from `TSrc` to `TDest`.

```csharp
public abstract class TypeConverter<TSrc, TDest> : ITypeConverter<TSrc, TDest>
```

## Lifecycle

```
1. Constructor called (DI injection happens here)
2. AsExpression() called → returns Expression<Func<TSrc, TDest>>
3. Expression stored for ProjectTo()
4. First Map() call → Lazy<> triggers .Compile() on the expression
5. Subsequent Map() calls → cached Func<TSrc, TDest> invoked directly
```

The expression is compiled **once** and cached via `Lazy<Func<TSrc, TDest>>`. Thread-safe by default.

## Methods

### AsExpression()

```csharp
public abstract Expression<Func<TSrc, TDest>> AsExpression();
```

**Abstract — must implement.** Returns the expression tree that defines the mapping.

This expression serves two purposes:
- **Map()** — compiled to `Func<TSrc, TDest>` via `.Compile()` (unless `Convert()` is overridden)
- **ProjectTo()** — passed to EF Core's `IQueryProvider` for SQL translation

#### Expression Rules for ProjectTo Compatibility

The expression must follow EF Core's translation rules. Supported:

| C# Construct | SQL Translation |
|---|---|
| Property access (`src.Name`) | Column reference (`"p"."Name"`) |
| String concatenation (`a + " " + b`) | `\|\|` operator |
| Ternary (`x ? a : b`) | `CASE WHEN ... THEN ... ELSE ... END` |
| Null check (`x != null ? x.Value : default`) | `CASE WHEN "x"."Id" IS NOT NULL THEN ... END` |
| Comparison (`x > 10`) | `>`, `<`, `=`, etc. |
| `string.Contains()` | `instr()` / `LIKE` |
| Arithmetic (`a * b`) | `ef_multiply()` / native operators |
| Navigation property (`src.Customer.Address.City`) | `JOIN` |
| Nested `.Select()` | Sub-select / `LEFT JOIN` |
| `.ToList()` on sub-select | Materialized by EF Core |

**Not supported** (use `withProjectTo: false`):

| C# Construct | Why |
|---|---|
| `string.Join()` | No SQL equivalent in most providers |
| `Regex.Match()` | Not translatable |
| Custom method calls | EF Core can't translate arbitrary methods |
| Closure captures (`_service.Calculate()`) | Can't be sent to the database |
| `DateTime.Parse()` | Provider-specific |

#### Examples

**Flat mapping:**
```csharp
public override Expression<Func<Product, ProductDto>> AsExpression() =>
    src => new ProductDto
    {
        Id          = src.Id,
        DisplayName = src.Name + " [" + src.Category + "]",
        Price       = src.Price
    };
```

**Nested navigation (3 levels):**
```csharp
public override Expression<Func<Order, OrderDto>> AsExpression() =>
    src => new OrderDto
    {
        Id               = src.Id,
        CustomerFullName = src.Customer.FirstName + " " + src.Customer.LastName,
        CustomerCity     = src.Customer.Address != null     // Order → Customer → Address
                               ? src.Customer.Address.City
                               : "N/A",
    };
```

**Nested collection with sub-mapping:**
```csharp
public override Expression<Func<Order, OrderDto>> AsExpression() =>
    src => new OrderDto
    {
        Id    = src.Id,
        Lines = src.OrderLines.Select(ol => new OrderLineDto
        {
            ProductName  = ol.Product.Name,                          // OrderLine → Product
            CategoryName = ol.Product.Category != null               // OrderLine → Product → Category
                               ? ol.Product.Category.Name
                               : "Uncategorized",
            PriceRange   = ol.UnitPrice > 50m ? "Premium"
                         : ol.UnitPrice > 10m ? "Mid"
                         : "Budget",
            LineTotal    = ol.Quantity * ol.UnitPrice
        }).ToList()
    };
```

---

### Convert()

```csharp
public virtual TDest Convert(TSrc source);
```

**Virtual.** By default, compiles `AsExpression()` and invokes the compiled delegate:

```csharp
// Default implementation (simplified)
private readonly Lazy<Func<TSrc, TDest>> _compiled = 
    new(() => AsExpression().Compile());

public virtual TDest Convert(TSrc source) => _compiled.Value(source);
```

#### When to Override

Override `Convert()` when you need:
- **Injected services** — expression trees can't capture service references
- **Complex C# logic** — loops, try/catch, async patterns, LINQ methods EF can't translate
- **Performance optimization** — replace `.Select().ToList()` with a direct `for` loop for nested collections

```csharp
public class OrderConverter : TypeConverter<Order, OrderDto>
{
    private readonly IPricingService _pricing;
    private readonly IDiscountEngine _discounts;

    public OrderConverter(IPricingService pricing, IDiscountEngine discounts)
    {
        _pricing = pricing;
        _discounts = discounts;
    }

    // AsExpression() — used by ProjectTo(), must be EF-translatable
    public override Expression<Func<Order, OrderDto>> AsExpression() =>
        src => new OrderDto
        {
            Id    = src.Id,
            Total = src.Lines.Sum(l => l.Quantity * l.UnitPrice)  // raw total in SQL
        };

    // Convert() — used by Map(), can use any C# code
    public override OrderDto Convert(Order source) => new()
    {
        Id    = source.Id,
        Total = _pricing.Calculate(
                    source.Lines,
                    _discounts.GetDiscount(source.CustomerId))
    };
}
```

#### Override for Performance

The compiled expression maps nested collections via LINQ `.Select().ToList()`. For hot paths, override with a direct loop:

```csharp
public override OrderDto Convert(Order source)
{
    var lines = new List<OrderLineDto>(source.OrderLines.Count);
    foreach (var ol in source.OrderLines)
    {
        lines.Add(new OrderLineDto
        {
            ProductName = ol.Product.Name,
            LineTotal   = ol.Quantity * ol.UnitPrice
        });
    }

    return new OrderDto
    {
        Id    = source.Id,
        Lines = lines
    };
}
```

## Registration

```csharp
// Direct instance — simplest
cfg.CreateMap(new ProductConverter());

// From DI container — constructor injection
cfg.CreateMap<Product, ProductDto, ProductConverter>(sp);

// Without ProjectTo — expression not stored
cfg.CreateMap(new ComplexConverter(), withProjectTo: false);

// Fluent chaining
new MapperConfiguration()
    .CreateMap(new ProductConverter())
    .CreateMap(new OrderConverter())
    .Build();
```

## Inheritance

`TypeConverter<TSrc, TDest>` implements `ITypeConverter<TSrc, TDest>`:

```csharp
public interface ITypeConverter<TSrc, TDest>
{
    Expression<Func<TSrc, TDest>> AsExpression();
    TDest Convert(TSrc source);
}
```

`BidirectionalConverter<TSrc, TDest>` extends `TypeConverter<TSrc, TDest>`:

```
ITypeConverter<TSrc, TDest>
  └─ TypeConverter<TSrc, TDest>                    ← one-way
       ├─ BidirectionalConverter<TSrc, TDest>        ← two-way
       └─ AutoTypeConverter<TSrc, TDest>             ← one-way + reflection fill-in
            └─ AutoBidirectionalConverter<TSrc, TDest>  ← two-way + reflection
```

This hierarchy means a single `CreateMap()` method handles all four — if the converter is bidirectional, the reverse direction is registered automatically via runtime `is` check.

See [`AutoTypeConverter`](./auto-type-converter) and [`AutoBidirectionalConverter`](./auto-bidirectional-converter) for reflection-assisted variants that auto-map matching name+type fields and let you override only what needs custom logic.
