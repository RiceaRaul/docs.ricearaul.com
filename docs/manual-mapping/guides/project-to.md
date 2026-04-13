# ProjectTo & SQL Generation

`ProjectTo()` translates your C# expression tree directly into SQL via EF Core's query provider. Only columns referenced in the expression are selected — the database does the projection, not your application.

## Usage

### Extension Method (Recommended)

```csharp
using ManualMapping.Extensions;

// TSrc is inferred from IQueryable<TSrc>
var dtos = dbContext.Orders
    .ProjectTo<OrderDto>(mapper)
    .ToListAsync();
```

### With Filters and Sorting

`ProjectTo()` returns `IQueryable<TDest>` — chain LINQ operators freely:

```csharp
var vipOrders = dbContext.Orders
    .Where(o => o.OrderDate >= cutoff)          // filter on entity columns
    .ProjectTo<OrderDto>(mapper)                // project
    .Where(d => d.CustomerTier == "VIP")        // filter on projected columns
    .OrderByDescending(d => d.OrderDate)
    .Take(50)
    .ToListAsync();
```

All filters, sorting, and paging are translated to SQL — no in-memory filtering.

### Direct Method

When you need to specify both type parameters:

```csharp
IQueryable<OrderDto> query = mapper.ProjectTo<Order, OrderDto>(dbContext.Orders);
```

## Expression to SQL Translation

Every C# construct in `AsExpression()` maps to a SQL equivalent:

### Scalar Operations

| C# Expression | SQL (SQLite) | SQL (SQL Server) |
|---|---|---|
| `src.Name` | `"p"."Name"` | `[p].[Name]` |
| `a + " " + b` | `"a" \|\| ' ' \|\| "b"` | `"a" + ' ' + "b"` |
| `a * b` | `ef_multiply(...)` | `"a" * "b"` |
| `(int)src.Price` | `CAST("Price" AS INTEGER)` | `CAST([Price] AS int)` |

### Conditional Logic

| C# Expression | SQL Generated |
|---|---|
| `x ? a : b` | `CASE WHEN "x" = 1 THEN "a" ELSE "b" END` |
| `x != null ? x.Value : "default"` | `CASE WHEN "x"."Id" IS NOT NULL THEN "x"."Value" ELSE 'default' END` |
| `x > 50 ? "A" : x > 10 ? "B" : "C"` | `CASE WHEN ... > 50 THEN 'A' WHEN ... > 10 THEN 'B' ELSE 'C' END` |

### String Operations

| C# Expression | SQL Generated |
|---|---|
| `str.Contains("text")` | `instr("str", 'text') > 0` / `CHARINDEX(...)` |
| `str.StartsWith("prefix")` | `"str" LIKE 'prefix%'` |
| `str.Length` | `length("str")` / `LEN(...)` |
| `str.ToUpper()` | `upper("str")` / `UPPER(...)` |

### Navigation Properties

| C# Expression | SQL Generated |
|---|---|
| `src.Customer` (required) | `INNER JOIN "Customers" ON ...` |
| `src.Customer.Address` (optional) | `LEFT JOIN "Addresses" ON ...` |
| `src.Customer.Address.City` (3 levels) | Chained JOINs |

### Nested Collections

| C# Expression | SQL Generated |
|---|---|
| `src.OrderLines.Select(ol => new Dto {...})` | `LEFT JOIN (SELECT ...) AS "s" ON ...` |
| `.ToList()` on sub-select | EF Core materializes the sub-select |

## Full SQL Example

Given this converter with ternaries, null-checks, 3-level navigation, and nested collections:

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
                                   ? src.Customer.Address.City
                                   : "N/A",
            CustomerTier     = src.Customer.Email.Contains("vip") ? "VIP" : "Standard",
            Lines = src.OrderLines.Select(ol => new OrderLineDto
            {
                Id           = ol.Id,
                ProductName  = ol.Product.Name,
                CategoryName = ol.Product.Category != null
                                   ? ol.Product.Category.Name
                                   : "Uncategorized",
                PriceRange   = ol.UnitPrice > 50m ? "Premium"
                             : ol.UnitPrice > 10m ? "Mid"
                             : "Budget",
                LineTotal    = ol.Quantity * ol.UnitPrice
            }).ToList()
        };
}
```

EF Core (SQLite) generates:

```sql
SELECT
    -- Scalar columns
    "o"."Id",
    "o"."OrderDate",

    -- String concatenation → || operator
    "c"."FirstName" || ' ' || "c"."LastName",

    -- Null-check ternary → CASE WHEN IS NOT NULL
    CASE
        WHEN "a"."Id" IS NOT NULL THEN "a"."City"
        ELSE 'N/A'
    END,

    -- String.Contains → instr()
    CASE
        WHEN instr("c"."Email", 'vip') > 0 THEN 'VIP'
        ELSE 'Standard'
    END,

    -- Nested collection columns from sub-select
    "s"."Id",
    "s"."ProductName",
    "s"."CategoryName",
    "s"."PriceRange",
    "s"."Quantity",
    "s"."UnitPrice",
    "s"."LineTotal"

FROM "Orders" AS "o"

-- Navigation: Order → Customer (required → INNER JOIN)
INNER JOIN "Customers" AS "c" ON "o"."CustomerId" = "c"."Id"

-- Navigation: Customer → Address (optional → LEFT JOIN)
LEFT JOIN "Addresses" AS "a" ON "c"."AddressId" = "a"."Id"

-- Nested collection: OrderLines with their own JOINs
LEFT JOIN (
    SELECT
        "o0"."Id",

        -- Navigation: OrderLine → Product
        "p"."Name" AS "ProductName",

        -- Null-check on Category → CASE WHEN
        CASE
            WHEN "c0"."Id" IS NOT NULL THEN "c0"."Name"
            ELSE 'Uncategorized'
        END AS "CategoryName",

        -- Chained ternary → nested CASE WHEN
        CASE
            WHEN ef_compare("o0"."UnitPrice", '50.0') > 0 THEN 'Premium'
            WHEN ef_compare("o0"."UnitPrice", '10.0') > 0 THEN 'Mid'
            ELSE 'Budget'
        END AS "PriceRange",

        "o0"."Quantity",
        "o0"."UnitPrice",

        -- Computed column: Quantity * UnitPrice
        ef_multiply(CAST("o0"."Quantity" AS TEXT), "o0"."UnitPrice") AS "LineTotal",

        "o0"."OrderId"

    FROM "OrderLines" AS "o0"
    -- Navigation: OrderLine → Product (INNER JOIN)
    INNER JOIN "Products" AS "p" ON "o0"."ProductId" = "p"."Id"
    -- Navigation: Product → Category (optional → LEFT JOIN)
    LEFT JOIN "Categories" AS "c0" ON "p"."CategoryId" = "c0"."Id"
) AS "s" ON "o"."Id" = "s"."OrderId"

ORDER BY "o"."Id", "c"."Id", "a"."Id", "s"."Id"
```

**Key observations:**
- **4 JOINs** generated from navigation property access
- **Only mapped columns** — `Tags`, `Street`, `Country` etc. not in SELECT
- **Ternaries** → `CASE WHEN ... THEN ... ELSE ... END`
- **Null-checks** → `IS NOT NULL` pattern
- **String operations** → provider-specific functions (`instr`, `||`)
- **Nested collection** → sub-select with `LEFT JOIN`
- **Computed values** → calculated server-side (`ef_multiply`)

## Verifying Generated SQL

Use `ToQueryString()` in tests to inspect the SQL:

```csharp
[Fact]
public void ProjectTo_GeneratesExpectedSql()
{
    var sql = db.Orders
        .ProjectTo<OrderDto>(mapper)
        .ToQueryString();

    // Verify projection (not SELECT *)
    Assert.DoesNotContain("SELECT *", sql, StringComparison.OrdinalIgnoreCase);

    // Verify JOINs for navigation properties
    Assert.Contains("JOIN", sql, StringComparison.OrdinalIgnoreCase);

    // Verify ternaries translated to CASE WHEN
    Assert.Contains("CASE", sql, StringComparison.OrdinalIgnoreCase);

    // Verify unused columns excluded
    Assert.DoesNotContain("Tags", sql, StringComparison.OrdinalIgnoreCase);
}
```

## Limitations

### EF Core Can't Translate

These patterns in `AsExpression()` will throw at query execution:

```csharp
// ✗ string.Join — no SQL equivalent
TagsSummary = string.Join(", ", src.Tags)

// ✗ Custom method call
Price = _service.Calculate(src.Price)

// ✗ Regex
IsValid = Regex.IsMatch(src.Email, @"^[\w.-]+@[\w.-]+$")

// ✗ DateTime.Parse
Created = DateTime.Parse(src.DateString)
```

**Solution:** Register with `withProjectTo: false` and override `Convert()`.

### Provider Differences

The exact SQL varies by database provider:

| Feature | SQLite | SQL Server | PostgreSQL |
|---|---|---|---|
| String concat | `\|\|` | `+` | `\|\|` |
| Contains | `instr() > 0` | `CHARINDEX() > 0` | `POSITION() > 0` |
| Decimal multiply | `ef_multiply()` | `*` | `*` |
| Case sensitivity | Case-sensitive | Case-insensitive | Case-sensitive |

Always test `ProjectTo()` against your actual database provider.

## Performance

`ProjectTo()` performance is determined by the **database query**, not the mapper. Both ManualMapping and AutoMapper generate equivalent SQL for the same logical projection.

The expression tree is built once at registration time and reused for every `ProjectTo()` call. The only per-call cost is creating the `Expression.Call` node to wrap the expression in a `Select()` — negligible compared to query execution.

See [Benchmarks](/manual-mapping/guides/benchmarks) for detailed comparison.
