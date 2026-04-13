# Configuration

## Manual Setup

Create a `MapperConfiguration`, register converters, and call `Build()`:

```csharp
var cfg = new MapperConfiguration();
cfg.CreateMap(new ProductConverter());
cfg.CreateMap(new OrderConverter());
cfg.CreateMap(new UserConverter());
IMapper mapper = cfg.Build();
```

`Build()` is a one-time operation. It:
1. Freezes all dictionaries into `FrozenDictionary` — optimized for read-only lookups
2. Returns an `IMapper` instance that is **thread-safe** and **immutable**
3. Expressions are lazily compiled on first `Map()` call via `Lazy<Func<TSrc, TDest>>`

::: warning
Do not call `CreateMap()` after `Build()` — the `MapperConfiguration` is consumed and the returned `IMapper` cannot be modified.
:::

## Dependency Injection

The `AddMapper()` extension registers `IMapper` as a **singleton**:

```csharp
// Register converters with appropriate lifetimes
builder.Services.AddScoped<IPricingService, PricingService>();
builder.Services.AddScoped<ProductConverter>();
builder.Services.AddScoped<OrderConverter>();
builder.Services.AddSingleton<CategoryConverter>();

// Register the mapper — resolves converters once at startup
builder.Services.AddMapper((cfg, sp) =>
{
    cfg.CreateMap<Product, ProductDto, ProductConverter>(sp);
    cfg.CreateMap<Order, OrderDto, OrderConverter>(sp);
    cfg.CreateMap<Category, CategoryDto, CategoryConverter>(sp);
});
```

### How `AddMapper()` Works Internally

```csharp
public static IServiceCollection AddMapper(
    this IServiceCollection services,
    Action<MapperConfiguration, IServiceProvider> configure)
{
    services.AddSingleton<IMapper>(sp =>
    {
        var cfg = new MapperConfiguration();
        configure(cfg, sp);       // your registrations
        return cfg.Build();       // frozen, immutable
    });
    return services;
}
```

The `IServiceProvider` is available during registration, so converters are resolved via `sp.GetRequiredService<TConverter>()`. This means:
- Converter **constructors** can inject any service
- Services are resolved at mapper build time (during first `IMapper` resolution)
- The mapper holds references to the converter instances (and their injected services)

### Lifetime Considerations

| Converter has... | Register converter as... | Notes |
|---|---|---|
| No dependencies | `AddSingleton` or inline `new()` | Stateless, cheapest option |
| Stateless services | `AddSingleton` | E.g. `ILogger`, configuration |
| Scoped services (`DbContext`) | `AddScoped` | Resolved once during mapper build — **not per-request** |
| Per-request state | Don't inject — use `Convert()` override | Override `Convert()` and resolve from `IServiceProvider` |

::: danger
The mapper is a singleton. If your converter injects a **scoped** service (like `DbContext`), that service is captured at startup and reused for the application's lifetime. This can cause `ObjectDisposedException` or stale data. For scoped dependencies, override `Convert()` and resolve manually.
:::

## withProjectTo Flag

Every `CreateMap()` call accepts a `bool withProjectTo` parameter (default: `true`):

```csharp
// Default: expression registered for both Map() and ProjectTo()
cfg.CreateMap(new SimpleConverter());                          // withProjectTo: true
cfg.CreateMap(new SimpleConverter(), withProjectTo: true);     // explicit

// Opt-out: expression only used for Map() (compiled), ProjectTo() throws
cfg.CreateMap(new ComplexConverter(), withProjectTo: false);
```

### When to Use `withProjectTo: false`

| Scenario | Use `false` |
|---|---|
| Expression uses `string.Join()`, `Regex`, custom methods | EF Core can't translate |
| You override `Convert()` with completely different logic | Expression doesn't represent the actual mapping |
| The mapping is only used in-memory, never with EF Core | Saves storing the expression |
| Expression captures a closure variable | Not translatable to SQL |

### What Happens When ProjectTo is Disabled

```csharp
cfg.CreateMap(new ComplexConverter(), withProjectTo: false);

// Map() works — uses compiled expression or Convert() override
mapper.Map<Product, ProductDto>(product);  // ✓

// ProjectTo() throws with a descriptive message
dbContext.Products.ProjectTo<ProductDto>(mapper);
// InvalidOperationException: ProjectTo not available for Product → ProductDto.
// Register with withProjectTo: true.
```

## Fluent Chaining

`CreateMap()` returns the `MapperConfiguration` instance for chaining:

```csharp
var mapper = new MapperConfiguration()
    .CreateMap(new ProductConverter())
    .CreateMap(new OrderConverter())
    .CreateMap(new UserConverter(), withProjectTo: false)
    .Build();
```

## Testing Configuration

For unit tests, create the mapper inline without DI:

```csharp
public class MyTests
{
    private readonly IMapper _mapper;

    public MyTests()
    {
        var cfg = new MapperConfiguration();
        cfg.CreateMap(new ProductConverter());
        _mapper = cfg.Build();
    }

    [Fact]
    public void Maps_Product_To_Dto()
    {
        var dto = _mapper.Map<Product, ProductDto>(
            new Product { Id = 1, Name = "Test" });
        Assert.Equal(1, dto.Id);
    }
}
```

For integration tests with EF Core, use SQLite in-memory:

```csharp
var options = new DbContextOptionsBuilder<MyDbContext>()
    .UseSqlite("DataSource=:memory:")
    .Options;

using var db = new MyDbContext(options);
db.Database.OpenConnection();
db.Database.EnsureCreated();

// Seed, then test ProjectTo
var dtos = db.Products.ProjectTo<ProductDto>(mapper).ToList();
```
