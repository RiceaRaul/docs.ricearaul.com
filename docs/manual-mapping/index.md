# ManualMapping.Net

Expression-first object mapper for .NET. Write one C# expression that powers both in-memory `Map()` and EF Core `ProjectTo()`.

## Design Philosophy

Most mappers fall into two categories:

- **Convention-based** (AutoMapper) — scans properties by name, builds mapping rules automatically. Fast to set up, hard to debug when conventions don't match.
- **Source-generated** (Mapperly) — generates mapping code at compile time via Roslyn. Zero runtime cost, but limited to what the generator can express.

ManualMapping takes a third approach: **expression-first**. You write a single `Expression<Func<TSrc, TDest>>` that serves two purposes:

1. **Compiled to a delegate** for in-memory `Map()` calls
2. **Translated to SQL** by EF Core for `ProjectTo()` queries

This means the same expression that maps `Order → OrderDto` in memory also generates the `SELECT ... JOIN ... CASE WHEN` query when used with `ProjectTo()`. No separate projection configuration, no `[NotMapped]` workarounds, no runtime surprises.

For DTOs that mostly mirror the entity shape, `AutoTypeConverter` / `AutoBidirectionalConverter` reflect matching name+type properties once at build time and merge them into the same expression — so you only hand-write the fields that need custom logic, without losing `ProjectTo()`.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   TypeConverter<TSrc, TDest>             │
│                                                         │
│   AsExpression() ──→ Expression<Func<TSrc, TDest>>      │
│        │                       │                        │
│        ▼                       ▼                        │
│   .Compile()              EF Core Translate             │
│        │                       │                        │
│        ▼                       ▼                        │
│   Func<TSrc, TDest>       SQL Query                     │
│        │                       │                        │
│        ▼                       ▼                        │
│   Map() ── in memory      ProjectTo() ── database       │
│                                                         │
│   Convert() ← virtual override for DI services          │
└─────────────────────────────────────────────────────────┘
```

When you register a converter:

1. `AsExpression()` is called once to get the expression tree
2. The expression is lazily compiled to a `Func<TSrc, TDest>` delegate (for `Map()`)
3. The same expression is stored as a `LambdaExpression` (for `ProjectTo()`)
4. Both are stored in a `FrozenDictionary` — immutable after `Build()`, optimized for reads

If you override `Convert()`, the compiled expression is bypassed for `Map()` calls, but `AsExpression()` is still used for `ProjectTo()`.

## Feature Matrix

| Feature | ManualMapping | AutoMapper | Mapperly |
|---|---|---|---|
| Mapping approach | Hand-written expressions (+ optional auto) | Convention + config | Source generator |
| Runtime reflection | None (auto variant: once at build time) | Heavy (property scanning) | None |
| `ProjectTo()` support | Expression IS the projection | Builds expression from config | Generates expression trees |
| DI injection in mapping | `Convert()` override | `IValueResolver` | Not supported |
| Bidirectional mapping | Single `CreateMap()` call | Two `CreateMap()` calls | Two `MapTo` attributes |
| Collection mapping | `Map<List<Dto>>(source)` | `Map<List<Dto>>(source)` | Generated loop |
| Nested objects in expression | `.Select()` → SQL sub-select | `ForMember()` chain | Generated recursion |
| Conditional mapping | Ternary in expression → `CASE WHEN` | `Condition()` / `PreCondition()` | `if` in partial method |
| Null handling | `x != null ? x.Value : default` → `CASE WHEN` | `NullSubstitute()` | Null check in generated code |
| Compile-time safety | Expression type-checked | Runtime errors possible | Full compile-time checking |

## Quick Example

```csharp
public class OrderConverter : TypeConverter<Order, OrderDto>
{
    public override Expression<Func<Order, OrderDto>> AsExpression() =>
        src => new OrderDto
        {
            Id               = src.Id,
            OrderDate        = src.OrderDate,
            CustomerFullName = src.Customer.FirstName + " " + src.Customer.LastName,
            CustomerCity     = src.Customer.Address != null
                                   ? src.Customer.Address.City : "N/A",
            CustomerTier     = src.Customer.IsVip ? "VIP" : "Standard",
            Lines = src.OrderLines.Select(ol => new OrderLineDto
            {
                ProductName  = ol.Product.Name,
                CategoryName = ol.Product.Category != null
                                   ? ol.Product.Category.Name : "Uncategorized",
                PriceRange   = ol.UnitPrice > 50m ? "Premium"
                             : ol.UnitPrice > 10m ? "Mid" : "Budget",
                LineTotal    = ol.Quantity * ol.UnitPrice
            }).ToList()
        };
}
```

```csharp
// In-memory — compiled delegate
var dto = mapper.Map<Order, OrderDto>(order);

// Collection — automatic detection
var dtos = mapper.Map<List<OrderDto>>(orders);

// EF Core — same expression translated to SQL with JOINs, CASE WHEN, sub-selects
var dtos = dbContext.Orders
    .ProjectTo<OrderDto>(mapper)
    .Where(d => d.CustomerTier == "VIP")
    .ToListAsync();
```

## When to Use ManualMapping

**Good fit:**
- You need `ProjectTo()` and want to see exactly what SQL gets generated
- Your mappings involve complex expressions (ternaries, null coalescing, computed fields)
- You need DI services in some converters while keeping `ProjectTo()` for others
- You have a moderate number of mappings and prefer explicitness over convention
- You want the same expression to work both in-memory and as a database projection

**Not ideal:**
- You need compile-time code generation with zero runtime cost — Mapperly is faster
- You never use `ProjectTo()` — the expression-first design doesn't add value

For matching-name DTOs that previously pushed you to AutoMapper, the `AutoTypeConverter` / `AutoBidirectionalConverter` variants cover that case while keeping the single-expression model.

## Project Structure

```
ManualMapping/
├── Abstractions/           Interfaces
│   ├── IMapper.cs              Map(), ProjectTo(), GetProjectionExpression()
│   └── ITypeConverter.cs       ITypeConverter<TSrc,TDest>, IBidirectionalConverter<TSrc,TDest>
├── Converters/             Base classes (inherit from these)
│   ├── TypeConverter.cs                   AsExpression() + virtual Convert()
│   ├── BidirectionalConverter.cs          AsReverseExpression() + virtual ConvertBack()
│   ├── AutoTypeConverter.cs               CustomExpression() + reflection fill-in
│   └── AutoBidirectionalConverter.cs      + CustomReverseExpression()
├── Reflection/             Build-time reflection
│   └── AutoMapExpressionBuilder.cs        Merges custom bindings with auto ones
├── Configuration/          Registration & runtime
│   ├── MapperConfiguration.cs  CreateMap(), Build()
│   └── MapperInstance.cs       FrozenDictionary-backed runtime mapper
└── Extensions/             Integration helpers
    ├── MapperServiceExtensions.cs  AddMapper() for DI
    └── QueryableExtensions.cs      ProjectTo<TDest>(mapper) extension
```
