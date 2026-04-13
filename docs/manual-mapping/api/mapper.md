# IMapper

The main interface for mapping objects. Resolved from DI or created via `MapperConfiguration.Build()`.

```csharp
public interface IMapper
{
    TDest Map<TSrc, TDest>(TSrc source);
    TDest Map<TDest>(object source);
    IQueryable<TDest> ProjectTo<TSrc, TDest>(IQueryable<TSrc> source);
    LambdaExpression GetProjectionExpression(Type srcType, Type destType);
}
```

## Thread Safety

`IMapper` is **immutable** and **thread-safe** after creation. All internal dictionaries are `FrozenDictionary` — no locks, no mutations. Safe to register as a singleton in DI.

## Methods

### Map\<TSrc, TDest\>(TSrc source)

```csharp
TDest Map<TSrc, TDest>(TSrc source);
```

Maps a single object using the **typed delegate path**. This is the fastest path — no boxing, direct `Func<TSrc, TDest>` invocation.

```csharp
var dto = mapper.Map<Product, ProductDto>(product);
```

**Internals:**
1. Looks up `Func<TSrc, TDest>` in `FrozenDictionary<(Type,Type), Delegate>`
2. Casts the delegate to `Func<TSrc, TDest>`
3. Invokes directly — no `object` boxing

**Throws:**
- `ArgumentNullException` — if `source` is null
- `InvalidOperationException` — if no mapping registered for `TSrc → TDest`

---

### Map\<TDest\>(object source)

```csharp
TDest Map<TDest>(object source);
```

Maps when the source type is known only at runtime. Also handles **collection mapping**.

#### Single Object

```csharp
object entity = GetEntityFromSomewhere();
var dto = mapper.Map<ProductDto>(entity);
```

Uses the **untyped delegate path**: `Func<object, object>` — source type resolved via `source.GetType()`.

#### Collection Mapping

When `source` is `IEnumerable` and `TDest` is a collection type, maps element-by-element automatically:

```csharp
// List
List<ProductDto> dtos = mapper.Map<List<ProductDto>>(products);

// IEnumerable
IEnumerable<ProductDto> dtos = mapper.Map<IEnumerable<ProductDto>>(products);

// Array
ProductDto[] dtos = mapper.Map<ProductDto[]>(products);

// IReadOnlyList, ICollection, IList — all supported
IReadOnlyList<ProductDto> dtos = mapper.Map<IReadOnlyList<ProductDto>>(products);
```

**How collection detection works:**
1. Check if `source` implements `IEnumerable` (and `TDest` is not `string`)
2. Extract element type from `TDest` (e.g. `List<ProductDto>` → `ProductDto`)
3. Extract source element type via `GetInterfaces()` reflection
4. Look up the element-level mapping (`Product → ProductDto`)
5. Iterate and map each element
6. Return as the requested collection type (List, array, etc.)

::: warning
Collection mapping via `Map<TDest>(object)` uses the untyped path with `Func<object, object>`. This involves boxing/casting per element. For maximum performance on hot paths, use `Map<TSrc, TDest>()` in a loop instead.
:::

**Throws:**
- `ArgumentNullException` — if `source` is null
- `InvalidOperationException` — if no element-level mapping registered

---

### ProjectTo\<TSrc, TDest\>(IQueryable\<TSrc\> source)

```csharp
IQueryable<TDest> ProjectTo<TSrc, TDest>(IQueryable<TSrc> source);
```

Applies the expression tree to an `IQueryable` source for server-side projection. The expression is passed to EF Core's query provider which translates it to SQL.

**Typically used via the extension method** (only specify `TDest`):

```csharp
using ManualMapping.Extensions;

var dtos = dbContext.Orders
    .Where(o => o.OrderDate > cutoff)       // filter first
    .ProjectTo<OrderDto>(mapper)            // project
    .OrderBy(d => d.CustomerFullName)       // sort projected columns
    .ToListAsync();                         // execute
```

**How the extension method works:**

```csharp
// QueryableExtensions.cs
public static IQueryable<TDest> ProjectTo<TDest>(
    this IQueryable source, IMapper mapper)
{
    var srcType = source.ElementType;  // TSrc inferred at runtime
    var expr = mapper.GetProjectionExpression(srcType, typeof(TDest));

    return source.Provider.CreateQuery<TDest>(
        Expression.Call(
            typeof(Queryable), "Select",
            [srcType, typeof(TDest)],
            source.Expression, expr));
}
```

This is equivalent to writing `.Select(src => new OrderDto { ... })` manually, but the expression comes from your converter.

**Throws:**
- `InvalidOperationException` — if mapping registered with `withProjectTo: false`

---

### GetProjectionExpression(Type srcType, Type destType)

```csharp
LambdaExpression GetProjectionExpression(Type srcType, Type destType);
```

Returns the raw `LambdaExpression` for a type pair. Used internally by `ProjectTo()` extension method. Can also be used for:
- Inspecting the expression tree
- Composing expressions manually
- Testing that the expression has the expected shape

```csharp
var expr = mapper.GetProjectionExpression(typeof(Product), typeof(ProductDto));
Console.WriteLine(expr);
// src => new ProductDto() {Id = src.Id, DisplayName = ...}
```

## Error Handling

All mapping methods throw `InvalidOperationException` with descriptive messages:

```csharp
// No mapping registered
mapper.Map<Product, string>(product);
// InvalidOperationException: No map registered for Product → String.

// ProjectTo disabled
dbContext.Products.ProjectTo<ProductDto>(mapper);
// InvalidOperationException: ProjectTo not available for Product → ProductDto.
// Register with withProjectTo: true.
```

## Null Semantics

- `Map()` throws `ArgumentNullException` on null source — never returns null
- Inside expressions, null navigation is handled by your ternary: `x != null ? x.Value : default`
- EF Core translates null checks to `CASE WHEN ... IS NOT NULL`
- Empty collections map to empty results (not null)

## Internal Implementation

The mapper stores three `FrozenDictionary` instances:

```csharp
FrozenDictionary<(Type, Type), Func<object, object>>  // untyped path
FrozenDictionary<(Type, Type), Delegate>               // typed path (Func<TSrc, TDest>)
FrozenDictionary<(Type, Type), LambdaExpression>       // ProjectTo expressions
```

`FrozenDictionary` is optimized for read-only lookups — faster than `Dictionary` for the immutable-after-build pattern.
