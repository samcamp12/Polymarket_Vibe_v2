using Microsoft.EntityFrameworkCore;
using PolymarketWatchlist.Data;
using PolymarketWatchlist.Models;
using PolymarketWatchlist.Services;

namespace PolymarketWatchlist.BackgroundServices;

/// <summary>
/// Wakes every 20 seconds, fetches mid-prices from CLOB for all tracked tokens,
/// upserts LatestPrice, then evaluates each Rule and upserts FlagState.
/// </summary>
public class PricePollingService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PricePollingService> _log;
    private static readonly TimeSpan _interval = TimeSpan.FromSeconds(20);

    public PricePollingService(IServiceScopeFactory scopeFactory, ILogger<PricePollingService> log)
    {
        _scopeFactory = scopeFactory;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _log.LogInformation("PricePollingService started (interval {Sec}s)", _interval.TotalSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await TickAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "PricePollingService tick failed");
            }

            await Task.Delay(_interval, stoppingToken);
        }
    }

    private async Task TickAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var polymarket = scope.ServiceProvider.GetRequiredService<PolymarketService>();

        // 1. Load all WatchlistMarkets with their rules
        var markets = await db.WatchlistMarkets
            .Include(m => m.Rules)
            .ToListAsync(ct);

        if (markets.Count == 0) return;

        // 2. Collect all unique token IDs (YES + NO)
        var tokenIds = markets
            .SelectMany(m => new[] { m.YesTokenId, m.NoTokenId })
            .Where(t => !string.IsNullOrEmpty(t))
            .Distinct()
            .ToList();

        // 3. Batch-fetch mid prices from CLOB
        var prices = await polymarket.GetMidpointsAsync(tokenIds);
        _log.LogInformation("Fetched {Count} prices for {TokenCount} tokens", prices.Count, tokenIds.Count);

        var now = DateTime.UtcNow;

        // 4. Upsert LatestPrice rows
        foreach (var (tokenId, midPrice) in prices)
        {
            var existing = await db.LatestPrices.FindAsync(new object[] { tokenId }, ct);
            if (existing == null)
            {
                db.LatestPrices.Add(new LatestPrice { TokenId = tokenId, MidPrice = midPrice, UpdatedAt = now });
            }
            else
            {
                existing.MidPrice = midPrice;
                existing.UpdatedAt = now;
            }
        }

        await db.SaveChangesAsync(ct);

        // 5. Evaluate rules → upsert FlagState
        foreach (var market in markets)
        {
            // Pick the first rule (MVP: one rule per market)
            var rule = market.Rules.FirstOrDefault();
            if (rule == null) continue;

            var yesMid = prices.TryGetValue(market.YesTokenId, out var yp) ? yp : (decimal?)null;
            bool inRange = yesMid.HasValue
                && yesMid.Value >= rule.LowThreshold
                && yesMid.Value <= rule.HighThreshold;

            var flagState = await db.FlagStates.FindAsync(new object[] { market.Id }, ct);
            if (flagState == null)
            {
                db.FlagStates.Add(new FlagState
                {
                    WatchlistMarketId = market.Id,
                    IsInRange = inRange,
                    CheckedAt = now
                });
            }
            else
            {
                flagState.IsInRange = inRange;
                flagState.CheckedAt = now;
            }
        }

        await db.SaveChangesAsync(ct);
    }
}
