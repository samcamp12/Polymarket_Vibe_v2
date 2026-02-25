namespace PolymarketWatchlist.Models;

public class LatestPrice
{
    public string TokenId { get; set; } = "";
    public decimal MidPrice { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
