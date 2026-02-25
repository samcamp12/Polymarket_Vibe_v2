namespace PolymarketWatchlist.Models;

public class Rule
{
    public int Id { get; set; }
    public int WatchlistMarketId { get; set; }
    public decimal LowThreshold { get; set; }   // e.g. 0.62
    public decimal HighThreshold { get; set; }  // e.g. 0.68
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public WatchlistMarket WatchlistMarket { get; set; } = null!;
}
