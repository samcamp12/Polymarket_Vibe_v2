using Microsoft.AspNetCore.Mvc;
using PolymarketWatchlist.DTOs;
using PolymarketWatchlist.Services;

namespace PolymarketWatchlist.Controllers;

[ApiController]
[Route("api/search")]
public class SearchController : ControllerBase
{
    private readonly PolymarketService _polymarket;

    public SearchController(PolymarketService polymarket)
        => _polymarket = polymarket;

    /// <summary>GET /api/search?q=bitcoin</summary>
    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q))
            return BadRequest("Query parameter 'q' is required.");

        var results = await _polymarket.SearchMarketsAsync(q);
        return Ok(results);
    }
}
