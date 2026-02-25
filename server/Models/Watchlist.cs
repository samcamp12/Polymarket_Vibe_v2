namespace PolymarketWatchlist.Models;

public class Watchlist
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<WatchlistMarket> Markets { get; set; } = new List<WatchlistMarket>();
}
