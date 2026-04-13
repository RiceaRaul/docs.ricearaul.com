# Installation

## Package Reference

ManualMapping is a project reference (not yet published as a NuGet package). Add it to your `.csproj`:

```xml
<ProjectReference Include="..\ManualMapping\ManualMapping.csproj" />
```

## Target Framework

ManualMapping targets **.NET 10+** and uses:
- `System.Collections.Frozen` — `FrozenDictionary` for immutable lookup after `Build()`
- `System.Linq.Expressions` — expression tree compilation and EF Core translation

```xml
<TargetFramework>net10.0</TargetFramework>
```

## Dependencies

The library has a single NuGet dependency:

| Package | Version | Purpose |
|---|---|---|
| `Microsoft.Extensions.DependencyInjection.Abstractions` | 10.0.x | `AddMapper()` extension method, `IServiceProvider` / `IServiceCollection` |

Your application adds its own dependencies depending on what features you use:

| Your Feature | Package You Add |
|---|---|
| `ProjectTo()` with EF Core | `Microsoft.EntityFrameworkCore` + your provider (`.SqlServer`, `.Sqlite`, `.Npgsql`) |
| DI registration via `AddMapper()` | `Microsoft.Extensions.DependencyInjection` |
| Testing with in-memory DB | `Microsoft.EntityFrameworkCore.Sqlite` (recommended) |

## Required Namespaces

```csharp
// Core — always needed
using ManualMapping.Abstractions;    // IMapper, ITypeConverter, IBidirectionalConverter
using ManualMapping.Converters;      // TypeConverter<TSrc,TDest>, BidirectionalConverter<TSrc,TDest>
using ManualMapping.Configuration;   // MapperConfiguration

// Extensions — for DI and ProjectTo
using ManualMapping.Extensions;      // AddMapper(), ProjectTo<TDest>()

// Expression trees — needed in converter files
using System.Linq.Expressions;       // Expression<Func<TSrc, TDest>>
```

## Verifying the Setup

Minimal test to confirm everything is wired correctly:

```csharp
using ManualMapping.Abstractions;
using ManualMapping.Configuration;
using ManualMapping.Converters;
using System.Linq.Expressions;

// 1. Define a converter
public class TestConverter : TypeConverter<string, int>
{
    public override Expression<Func<string, int>> AsExpression()
        => src => src.Length;
}

// 2. Build the mapper
var cfg = new MapperConfiguration();
cfg.CreateMap(new TestConverter());
IMapper mapper = cfg.Build();

// 3. Test it
int result = mapper.Map<string, int>("hello");
Console.WriteLine(result); // 5
```

## Troubleshooting

### `InvalidOperationException: No map registered for X → Y`

The type pair was never registered via `CreateMap()`. Check:
- The converter's generic types match what you're calling `Map<TSrc, TDest>()` with
- The converter was registered before `Build()` was called
- If using DI, the converter is registered in the service collection

### `InvalidOperationException: ProjectTo not available for X → Y`

The mapping was registered with `withProjectTo: false`. Either:
- Change to `withProjectTo: true` if the expression is EF-translatable
- Use `Map()` instead of `ProjectTo()` for this type pair

### EF Core throws on `ProjectTo()`

Your expression uses a method EF Core can't translate to SQL (e.g. `string.Join()`, `Regex.Match()`, custom methods). Register with `withProjectTo: false` and override `Convert()` instead.
