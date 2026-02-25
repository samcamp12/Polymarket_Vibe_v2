using Microsoft.EntityFrameworkCore;
using PolymarketWatchlist.BackgroundServices;
using PolymarketWatchlist.Data;
using PolymarketWatchlist.Services;

var builder = WebApplication.CreateBuilder(args);

// ── EF Core (SQL Server) ──────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// ── HttpClient for Polymarket ─────────────────────────────────────────────
// AddHttpClient<T> registers PolymarketService as transient with a proper
// named HttpClient. Do NOT also call AddScoped<PolymarketService>() —
// that would override this registration with one that can't inject HttpClient.
builder.Services.AddHttpClient<PolymarketService>();

// ── Background price polling ──────────────────────────────────────────────
builder.Services.AddHostedService<PricePollingService>();

// ── API infra ─────────────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS – allow the React dev server
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins("http://localhost:5173", "http://localhost:3000")
     .AllowAnyMethod()
     .AllowAnyHeader()
));

var app = builder.Build();

// ── Ensure DB is created (for dev convenience; prefer Migrations in prod) ──
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors();
app.MapControllers();
app.Run();
