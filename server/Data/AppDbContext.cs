using Microsoft.EntityFrameworkCore;
using PolymarketWatchlist.Models;

namespace PolymarketWatchlist.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Watchlist> Watchlists => Set<Watchlist>();
    public DbSet<WatchlistMarket> WatchlistMarkets => Set<WatchlistMarket>();
    public DbSet<Rule> Rules => Set<Rule>();
    public DbSet<LatestPrice> LatestPrices => Set<LatestPrice>();
    public DbSet<FlagState> FlagStates => Set<FlagState>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        // Watchlist
        mb.Entity<Watchlist>(e =>
        {
            e.ToTable("Watchlist");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
        });

        // WatchlistMarket
        mb.Entity<WatchlistMarket>(e =>
        {
            e.ToTable("WatchlistMarket");
            e.HasKey(x => x.Id);
            e.Property(x => x.MarketId).HasMaxLength(100).IsRequired();
            e.Property(x => x.Question).HasMaxLength(500).IsRequired();
            e.Property(x => x.YesTokenId).HasMaxLength(100).IsRequired();
            e.Property(x => x.NoTokenId).HasMaxLength(100).IsRequired();

            e.HasOne(x => x.Watchlist)
             .WithMany(w => w.Markets)
             .HasForeignKey(x => x.WatchlistId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // Rule
        mb.Entity<Rule>(e =>
        {
            e.ToTable("Rule");
            e.HasKey(x => x.Id);
            e.Property(x => x.LowThreshold).HasPrecision(5, 4);
            e.Property(x => x.HighThreshold).HasPrecision(5, 4);

            e.HasOne(x => x.WatchlistMarket)
             .WithMany(wm => wm.Rules)
             .HasForeignKey(x => x.WatchlistMarketId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // LatestPrice – keyed on TokenId (string PK)
        mb.Entity<LatestPrice>(e =>
        {
            e.ToTable("LatestPrice");
            e.HasKey(x => x.TokenId);
            e.Property(x => x.TokenId).HasMaxLength(100);
            e.Property(x => x.MidPrice).HasPrecision(10, 6);
        });

        // FlagState – 1-to-1 with WatchlistMarket, WatchlistMarketId is both PK and FK
        mb.Entity<FlagState>(e =>
        {
            e.ToTable("FlagState");
            e.HasKey(x => x.WatchlistMarketId);

            e.HasOne(x => x.WatchlistMarket)
             .WithOne(wm => wm.FlagState)
             .HasForeignKey<FlagState>(x => x.WatchlistMarketId)
             .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
