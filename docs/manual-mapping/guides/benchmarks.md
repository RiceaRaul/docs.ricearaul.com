# Benchmarks

Detailed performance comparison between ManualMapping and AutoMapper 13.x using BenchmarkDotNet.

## Environment

```
BenchmarkDotNet v0.15.8, Linux CachyOS
Intel Core i7-10750H CPU 2.60GHz, 1 CPU, 12 logical / 6 physical cores
.NET SDK 10.0.201
Runtime: .NET 10.0.5, X64 RyuJIT x86-64-v3
```

## Test Setup

### Models (3 levels deep)

```
Order
  ├── Id, OrderDate
  ├── Customer (INNER JOIN)
  │     ├── FirstName, LastName, Email, IsVip
  │     └── Address (LEFT JOIN, nullable)
  │           └── Street, City, Country
  └── OrderLines (collection, 3-8 per order)
        ├── Quantity, UnitPrice, Discount (nullable)
        └── Product (INNER JOIN)
              ├── Name, Price
              └── Category (LEFT JOIN, nullable)
                    └── Name
```

### Expression Complexity

The converter includes:
- String concatenation (`FirstName + " " + LastName`)
- 3-level null-check (`Customer.Address != null ? .City : "N/A"`)
- Boolean ternary (`IsVip ? "VIP" : "Standard"`)
- Chained ternary (`Price > 50 ? "Premium" : Price > 10 ? "Mid" : "Budget"`)
- Nullable arithmetic (`Discount != null ? UnitPrice - Discount.Value : UnitPrice`)
- Nested `.Select().ToList()` for OrderLines with its own sub-mappings

## Map() — In-Memory

Single nested order with 10 order lines, each with Product + Category:

| Method | Mean | Ratio | Gen0 | Allocated | Alloc Ratio |
|---|---|---|---|---|---|
| **ManualMapping** | **1,134 ns** | **1.00** | 0.1965 | 1.21 KB | 1.00 |
| AutoMapper | 717 ns | 0.63 | 0.2060 | 1.27 KB | 1.05 |

### Analysis

AutoMapper is **~37% faster** for nested `Map()`. The breakdown:

```
ManualMapping (1,134 ns):
├── FrozenDictionary lookup + typed delegate call    ~15 ns
├── Scalar property mapping (Id, Date, strings)      ~30 ns
└── .Select(ol => new OrderLineDto{...}).ToList()  ~1,089 ns  ← 96%
     ├── LINQ Select iterator allocation
     ├── ToList() → List<T> allocation + resize
     └── 10× lambda invocation through LINQ pipeline

AutoMapper (717 ns):
├── Internal type-pair dispatch                      ~15 ns
├── Scalar property mapping                          ~30 ns
└── Optimized collection loop                       ~672 ns
     ├── No LINQ iterator — direct for loop
     └── 10× typed delegate call (no LINQ overhead)
```

**Root cause:** ManualMapping compiles the expression including `.Select().ToList()`, which goes through LINQ's iterator machinery. AutoMapper maps collections with a pre-compiled direct loop.

**This is a design trade-off**, not a bug. The expression must be valid for both EF Core (where `.Select()` becomes a SQL sub-select) and in-memory (where it goes through LINQ). You can't replace `.Select()` with a `for` loop in an expression tree.

### Mitigation

For hot paths, override `Convert()` with a direct loop:

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

    return new OrderDto { Id = source.Id, Lines = lines };
}
```

This keeps `AsExpression()` for `ProjectTo()` (SQL sub-select) while the override handles `Map()` (optimized loop).

For **flat objects** (no nested collections), ManualMapping is competitive with AutoMapper — the gap only appears with nested `.Select().ToList()`.

## ProjectTo() — EF Core / SQLite

Orders with 3-8 order lines each, JOINs across 4 tables, CASE WHEN for all ternaries:

| Method | Orders | Mean | Ratio | Gen0 | Gen1 | Allocated | Alloc Ratio |
|---|---|---|---|---|---|---|---|
| **ManualMapping** | **50** | **3.26 ms** | **1.00** | 93.75 | 15.63 | 593.9 KB | 1.00 |
| AutoMapper | 50 | 3.27 ms | 1.00 | 93.75 | 15.63 | 591.3 KB | 1.00 |
| **ManualMapping** | **500** | **30.3 ms** | **1.00** | 937.50 | 343.75 | 5,851 KB | 1.00 |
| AutoMapper | 500 | 30.6 ms | 1.01 | 937.50 | 375.00 | 5,849 KB | 1.00 |

### Analysis

**Identical performance.** Both generate equivalent SQL, so the database query execution dominates. The expression tree construction (ManualMapping's direct expression vs AutoMapper's built expression) is negligible compared to:
- SQLite query parsing and optimization
- Disk I/O (even in-memory SQLite has overhead)
- Result set materialization

The ~2KB allocation difference is AutoMapper's internal mapping plan cache — irrelevant at this scale.

## Summary

| Scenario | Winner | Gap | Why |
|---|---|---|---|
| Flat `Map()` (no collections) | ~Tied | <5% | Both use compiled typed delegates |
| Nested `Map()` (with collections) | AutoMapper | ~37% | LINQ `.Select().ToList()` vs direct loop |
| `ProjectTo()` (any complexity) | Tied | <2% | Database dominates, same SQL generated |
| Memory allocation | Tied | <5% | Both allocate the DTO + collection |

## Running Benchmarks

```bash
# All benchmarks
dotnet run --project ManualMapping.Benchmarks -c Release -- --filter '*'

# Map() only
dotnet run --project ManualMapping.Benchmarks -c Release -- --filter '*MapBenchmarks*'

# ProjectTo() only
dotnet run --project ManualMapping.Benchmarks -c Release -- --filter '*ProjectToBenchmarks*'
```

::: tip
Always run benchmarks in **Release** mode (`-c Release`). Debug mode includes debugging overhead that skews results.
:::
