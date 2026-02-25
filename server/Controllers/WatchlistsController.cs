using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PolymarketWatchlist.Data;
using PolymarketWatchlist.DTOs;
using PolymarketWatchlist.Models;

namespace PolymarketWatchlist.Controllers;

[ApiController]
[Route("api/watchlists")]
public class WatchlistsController : ControllerBase
{
    private readonly AppDbContext _db;

    public WatchlistsController(AppDbContext db) => _db = db;

    // GET /api/watchlists
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var list = await _db.Watchlists
            .OrderByDescending(w => w.CreatedAt)
            .Select(w => new WatchlistDto(w.Id, w.Name, w.CreatedAt))
            .ToListAsync();
        return Ok(list);
    }

    // POST /api/watchlists
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateWatchlistRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest("Name is required.");

        var wl = new Watchlist { Name = req.Name };
        _db.Watchlists.Add(wl);
        await _db.SaveChangesAsync();
        return Ok(new WatchlistDto(wl.Id, wl.Name, wl.CreatedAt));
    }

    // POST /api/watchlists/{id}/markets
    [HttpPost("{id:int}/markets")]
    public async Task<IActionResult> AddMarket(int id, [FromBody] AddMarketRequest req)
    {
        if (!await _db.Watchlists.AnyAsync(w => w.Id == id))
            return NotFound($"Watchlist {id} not found.");

        var wm = new WatchlistMarket
        {
            WatchlistId = id,
            MarketId    = req.MarketId,
            Question    = req.Question,
            YesTokenId  = req.YesTokenId,
            NoTokenId   = req.NoTokenId
        };
        _db.WatchlistMarkets.Add(wm);
        await _db.SaveChangesAsync();
        return Ok(new { wm.Id, wm.MarketId, wm.Question, wm.YesTokenId, wm.NoTokenId });
    }

    // DELETE /api/watchlists/{id}/markets/{marketId}
    [HttpDelete("{id:int}/markets/{marketId:int}")]
    public async Task<IActionResult> RemoveMarket(int id, int marketId)
    {
        var wm = await _db.WatchlistMarkets
            .FirstOrDefaultAsync(m => m.WatchlistId == id && m.Id == marketId);
        if (wm == null)
            return NotFound($"Market {marketId} not found in watchlist {id}.");

        _db.WatchlistMarkets.Remove(wm);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // GET /api/watchlists/{id}/view
    [HttpGet("{id:int}/view")]
    public async Task<IActionResult> View(
        int id,
        [FromQuery] bool? inRangeOnly,
        [FromQuery] string? sort)
    {
        if (!await _db.Watchlists.AnyAsync(w => w.Id == id))
            return NotFound($"Watchlist {id} not found.");

        var markets = await _db.WatchlistMarkets
            .Where(m => m.WatchlistId == id)
            .Include(m => m.Rules)
            .Include(m => m.FlagState)
            .ToListAsync();

        // Load prices in one query for all tokens belonging to this watchlist
        var allTokenIds = markets.SelectMany(m => new[] { m.YesTokenId, m.NoTokenId }).Distinct().ToList();
        var prices = await _db.LatestPrices
            .Where(p => allTokenIds.Contains(p.TokenId))
            .ToDictionaryAsync(p => p.TokenId);

        var rows = markets.Select(m =>
        {
            prices.TryGetValue(m.YesTokenId, out var yp);
            prices.TryGetValue(m.NoTokenId, out var np);
            var rule = m.Rules.FirstOrDefault();

            return new WatchlistViewRow(
                WatchlistMarketId: m.Id,
                MarketId: m.MarketId,
                Question: m.Question,
                YesPct: yp?.MidPrice,
                NoPct:  np?.MidPrice,
                IsInRange: m.FlagState?.IsInRange,
                PriceUpdatedAt: yp?.UpdatedAt,
                Rule: rule == null ? null : new RuleDto(rule.Id, rule.WatchlistMarketId, rule.LowThreshold, rule.HighThreshold)
            );
        }).ToList();

        // Filter
        if (inRangeOnly == true)
            rows = rows.Where(r => r.IsInRange == true).ToList();

        // Sort
        rows = sort switch
        {
            "yes_asc"  => rows.OrderBy(r => r.YesPct).ToList(),
            "yes_desc" => rows.OrderByDescending(r => r.YesPct).ToList(),
            "flag"     => rows.OrderByDescending(r => r.IsInRange).ToList(),
            _          => rows
        };

        return Ok(rows);
    }
}
