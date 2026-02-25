namespace PolymarketWatchlist.Models;

public class WatchlistMarket
{
    public int Id { get; set; }
    public int WatchlistId { get; set; }
    public string MarketId { get; set; } = "";       // Polymarket market id/slug
    public string Question { get; set; } = "";
    public string YesTokenId { get; set; } = "";
    public string NoTokenId { get; set; } = "";
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;

    public Watchlist Watchlist { get; set; } = null!;
    public ICollection<Rule> Rules { get; set; } = new List<Rule>();
    public LatestPrice? YesPrice { get; set; }
    public LatestPrice? NoPrice { get; set; }
    public FlagState? FlagState { get; set; }
}
