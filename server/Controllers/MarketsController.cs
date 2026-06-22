using Microsoft.AspNetCore.Mvc;
using PolymarketWatchlist.Services;

namespace PolymarketWatchlist.Controllers;

[ApiController]
[Route("api/markets")]
public class MarketsController : ControllerBase
{
    private readonly PolymarketService _polymarket;

    public MarketsController(PolymarketService polymarket)
        => _polymarket = polymarket;

    /// <summary>GET /api/markets/popular?tag=politics&amp;limit=20</summary>
    [HttpGet("popular")]
    public async Task<IActionResult> GetPopular(
        [FromQuery] string? tag   = null,
        [FromQuery] int     limit = 20)
    {
        if (limit is < 1 or > 50) limit = 20;
        var results = await _polymarket.GetPopularMarketsAsync(tag, limit);
        return Ok(results);
    }
}
