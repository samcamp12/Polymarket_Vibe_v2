namespace PolymarketWatchlist.DTOs;

// ---------- Watchlist ----------
public record CreateWatchlistRequest(string Name);

public record WatchlistDto(int Id, string Name, DateTime CreatedAt);

// ---------- Add market to watchlist ----------
public record AddMarketRequest(
    string MarketId,
    string Question,
    string YesTokenId,
    string NoTokenId
);

// ---------- Rule ----------
public record CreateRuleRequest(
    int WatchlistMarketId,
    decimal LowThreshold,
    decimal HighThreshold
);

public record RuleDto(int Id, int WatchlistMarketId, decimal LowThreshold, decimal HighThreshold);

// ---------- Watchlist view (enriched rows) ----------
public record WatchlistViewRow(
    int WatchlistMarketId,
    string MarketId,
    string Question,
    decimal? YesPct,        // null if price not yet fetched
    decimal? NoPct,
    bool? IsInRange,        // null if no rule defined
    DateTime? PriceUpdatedAt,
    RuleDto? Rule
);

// ---------- Gamma search proxy ----------
public record GammaMarketSummary(
    string Id,
    string Question,
    string Slug,
    string YesTokenId,
    string NoTokenId,
    bool Active
);
