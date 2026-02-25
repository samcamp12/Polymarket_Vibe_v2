namespace PolymarketWatchlist.Models;

public class FlagState
{
    public int WatchlistMarketId { get; set; }
    public bool IsInRange { get; set; }
    public DateTime CheckedAt { get; set; } = DateTime.UtcNow;

    public WatchlistMarket WatchlistMarket { get; set; } = null!;
}
