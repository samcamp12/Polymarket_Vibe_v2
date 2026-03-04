using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PolymarketWatchlist.Data;
using PolymarketWatchlist.DTOs;
using PolymarketWatchlist.Models;

namespace PolymarketWatchlist.Controllers;

[ApiController]
[Route("api/rules")]
public class RulesController : ControllerBase
{
    private readonly AppDbContext _db;

    public RulesController(AppDbContext db) => _db = db;

    // POST /api/rules
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRuleRequest req)
    {
        if (!await _db.WatchlistMarkets.AnyAsync(m => m.Id == req.WatchlistMarketId))
            return NotFound($"WatchlistMarket {req.WatchlistMarketId} not found.");

        if (req.LowThreshold < 0 || req.HighThreshold > 1 || req.LowThreshold >= req.HighThreshold)
            return BadRequest("Thresholds must satisfy 0 ≤ low < high ≤ 1.");

        // Remove existing rule for this market (MVP: one rule per market)
        var existing = await _db.Rules.Where(r => r.WatchlistMarketId == req.WatchlistMarketId).ToListAsync();
        _db.Rules.RemoveRange(existing);

        var rule = new Rule
        {
            WatchlistMarketId = req.WatchlistMarketId,
            LowThreshold      = req.LowThreshold,
            HighThreshold     = req.HighThreshold
        };
        _db.Rules.Add(rule);
        await _db.SaveChangesAsync();

        // Immediately re-evaluate FlagState using current LatestPrice
        var market = await _db.WatchlistMarkets.FindAsync(req.WatchlistMarketId);
        if (market != null)
        {
            var yesPrice = await _db.LatestPrices.FindAsync(market.YesTokenId);
            bool isInRange = yesPrice != null
                && yesPrice.MidPrice >= req.LowThreshold
                && yesPrice.MidPrice <= req.HighThreshold;

            var flag = await _db.FlagStates.FindAsync(req.WatchlistMarketId);
            if (flag != null)
            {
                flag.IsInRange = isInRange;
                flag.CheckedAt = DateTime.UtcNow;
            }
            else
            {
                _db.FlagStates.Add(new FlagState
                {
                    WatchlistMarketId = req.WatchlistMarketId,
                    IsInRange = isInRange,
                    CheckedAt = DateTime.UtcNow
                });
            }
            await _db.SaveChangesAsync();
        }

        return Ok(new RuleDto(rule.Id, rule.WatchlistMarketId, rule.LowThreshold, rule.HighThreshold));
    }

    // DELETE /api/rules/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var rule = await _db.Rules.FindAsync(id);
        if (rule == null) return NotFound();

        var wmId = rule.WatchlistMarketId;
        _db.Rules.Remove(rule);
        await _db.SaveChangesAsync();

        // Clear FlagState since no rule remains (MVP: one rule per market)
        var flag = await _db.FlagStates.FindAsync(wmId);
        if (flag != null)
        {
            flag.IsInRange = false;
            flag.CheckedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        return NoContent();
    }
}
