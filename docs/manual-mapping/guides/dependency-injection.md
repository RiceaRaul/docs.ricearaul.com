# Dependency Injection

ManualMapping converters support full constructor injection. Override virtual methods to use injected services in your mapping logic.

## Virtual Override Reference

| Method | Base class | Default behavior | Override to... |
|---|---|---|---|
| `AsExpression()` | `TypeConverter` | **abstract** — must implement | Define the EF-translatable projection |
| `Convert(TSrc)` | `TypeConverter` | Compiles `AsExpression()` | Use injected services for `Map()` |
| `AsReverseExpression()` | `BidirectionalConverter` | **abstract** — must implement | Define reverse projection |
| `ConvertBack(TDest)` | `BidirectionalConverter` | Compiles `AsReverseExpression()` | Use injected services for reverse `Map()` |

## Patterns

### Pattern 1: No DI — Expression Only

The simplest case. No constructor, no overrides. `Convert()` auto-compiles from `AsExpression()`:

```csharp
public class ProductConverter : TypeConverter<Product, ProductDto>
{
    public override Expression<Func<Product, ProductDto>> AsExpression() =>
        src => new ProductDto
        {
            Id          = src.Id,
            DisplayName = src.Name + " [" + src.Category + "]",
            Price       = src.Price
        };
    
    // Convert() is auto-compiled from AsExpression() — no override needed
}
```

Registration:
```csharp
cfg.CreateMap(new ProductConverter());
// or
cfg.CreateMap<Product, ProductDto, ProductConverter>(sp);
```

Both `Map()` and `ProjectTo()` use the same expression.

### Pattern 2: DI Service + ProjectTo (Dual Path)

The most powerful pattern. `AsExpression()` provides the SQL-translatable projection, `Convert()` override uses injected services for in-memory mapping. **Both work simultaneously.**

```csharp
public class ProductConverter : TypeConverter<Product, ProductDto>
{
    private readonly IPricingService _pricing;
    private readonly ITaxCalculator _tax;

    public ProductConverter(IPricingService pricing, ITaxCalculator tax)
    {
        _pricing = pricing;
        _tax = tax;
    }

    // AsExpression() — translated to SQL by EF Core
    // Cannot use _pricing or _tax here (expression trees can't capture services)
    public override Expression<Func<Product, ProductDto>> AsExpression() =>
        src => new ProductDto
        {
            Id          = src.Id,
            DisplayName = src.Name,
            Price       = src.Price    // raw price — no discount in SQL
        };

    // Convert() — compiled C#, full access to injected services
    public override ProductDto Convert(Product source) => new()
    {
        Id          = source.Id,
        DisplayName = source.Name,
        Price       = _tax.WithTax(
                          _pricing.ApplyDiscount(source.Price))
    };
}
```

Registration with `withProjectTo: true`:
```csharp
builder.Services.AddScoped<IPricingService, PricingService>();
builder.Services.AddScoped<ITaxCalculator, TaxCalculator>();
builder.Services.AddScoped<ProductConverter>();

builder.Services.AddMapper((cfg, sp) =>
{
    cfg.CreateMap<Product, ProductDto, ProductConverter>(sp, withProjectTo: true);
});
```

Behavior:

| Call | Executes | Service | Result |
|---|---|---|---|
| `mapper.Map<Product, ProductDto>(p)` | `Convert()` | Yes — discount + tax applied | Discounted price |
| `db.Products.ProjectTo<ProductDto>(mapper)` | `AsExpression()` → SQL | No — raw SQL projection | Raw price |

::: tip
This pattern is ideal when the SQL projection is a "base" view and the in-memory mapping adds business logic on top. The database returns the raw data, your services transform it.
:::

### Pattern 3: DI Service Only (No ProjectTo)

When `AsExpression()` can't represent the mapping at all (e.g. the mapping depends entirely on service calls):

```csharp
public class ReportConverter : TypeConverter<SalesData, ReportDto>
{
    private readonly IAnalyticsEngine _analytics;

    public ReportConverter(IAnalyticsEngine analytics) => _analytics = analytics;

    // AsExpression() still required (abstract) but won't be used for ProjectTo
    public override Expression<Func<SalesData, ReportDto>> AsExpression() =>
        src => new ReportDto { Id = src.Id }; // minimal stub

    public override ReportDto Convert(SalesData source) => new()
    {
        Id         = source.Id,
        Trend      = _analytics.CalculateTrend(source.History),
        Forecast   = _analytics.Predict(source.History, 30),
        Anomalies  = _analytics.DetectAnomalies(source.History)
    };
}
```

Register with `withProjectTo: false`:
```csharp
cfg.CreateMap<SalesData, ReportDto, ReportConverter>(sp, withProjectTo: false);

// Map() works
mapper.Map<SalesData, ReportDto>(data);

// ProjectTo() throws InvalidOperationException
db.SalesData.ProjectTo<ReportDto>(mapper); // ✗
```

### Pattern 4: Bidirectional with DI

Override both `Convert()` and `ConvertBack()`:

```csharp
public class UserConverter : BidirectionalConverter<User, UserDto>
{
    private readonly IEncryptionService _crypto;
    private readonly IValidator<UserDto> _validator;

    public UserConverter(IEncryptionService crypto, IValidator<UserDto> validator)
    {
        _crypto = crypto;
        _validator = validator;
    }

    // Forward expression — SQL-safe
    public override Expression<Func<User, UserDto>> AsExpression() =>
        src => new UserDto
        {
            Id    = src.Id,
            Email = src.Email,
            Name  = src.FirstName + " " + src.LastName
        };

    // Reverse expression — SQL-safe
    public override Expression<Func<UserDto, User>> AsReverseExpression() =>
        src => new User
        {
            Id        = src.Id,
            Email     = src.Email,
            FirstName = src.Name
        };

    // Forward override — decrypt
    public override UserDto Convert(User source) => new()
    {
        Id    = source.Id,
        Email = _crypto.Decrypt(source.EncryptedEmail),
        Name  = source.FirstName + " " + source.LastName
    };

    // Reverse override — validate then encrypt
    public override User ConvertBack(UserDto source)
    {
        _validator.ValidateAndThrow(source);

        return new User
        {
            Id             = source.Id,
            EncryptedEmail = _crypto.Encrypt(source.Email),
            FirstName      = source.Name.Split(' ')[0],
            LastName       = source.Name.Contains(' ')
                                 ? source.Name[(source.Name.IndexOf(' ') + 1)..]
                                 : ""
        };
    }
}
```

Four distinct behaviors from one converter:

| Call | Method | Service | Notes |
|---|---|---|---|
| `mapper.Map<User, UserDto>(user)` | `Convert()` | Decrypts email | In-memory |
| `mapper.Map<UserDto, User>(dto)` | `ConvertBack()` | Validates + encrypts | In-memory |
| `db.Users.ProjectTo<UserDto>(mapper)` | `AsExpression()` | None | SQL projection |
| (reverse ProjectTo) | `AsReverseExpression()` | None | SQL projection |

## Scoping Gotchas

### The Singleton Trap

`IMapper` is registered as a **singleton**. Converters (and their injected services) are captured at build time:

```csharp
// DANGER: DbContext is scoped, but captured in a singleton
builder.Services.AddScoped<MyDbContext>();
builder.Services.AddScoped<MyConverter>(); // injects DbContext

builder.Services.AddMapper((cfg, sp) =>
{
    // This DbContext instance lives forever — stale data, disposed exceptions
    cfg.CreateMap<A, B, MyConverter>(sp);
});
```

**Solutions:**

1. **Don't inject scoped services** — use `Convert()` override with manual resolution:

```csharp
public class MyConverter : TypeConverter<A, B>
{
    private readonly IServiceProvider _sp;

    public MyConverter(IServiceProvider sp) => _sp = sp;

    public override B Convert(A source)
    {
        using var scope = _sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<MyDbContext>();
        // use db...
    }
}
```

2. **Inject only singleton/transient services** — stateless services are safe.

### Testing with DI

For unit tests, create converters directly without the DI container:

```csharp
// Mock the service
var mockPricing = new Mock<IPricingService>();
mockPricing.Setup(p => p.ApplyDiscount(100m)).Returns(90m);

// Create converter with mock
var converter = new ProductConverter(mockPricing.Object);

// Build mapper
var cfg = new MapperConfiguration();
cfg.CreateMap(converter, withProjectTo: false);
var mapper = cfg.Build();

// Test
var dto = mapper.Map<Product, ProductDto>(new Product { Price = 100m });
Assert.Equal(90m, dto.Price);
```
