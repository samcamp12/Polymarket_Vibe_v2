using System.Text.Json;
using System.Text.Json.Nodes;
using PolymarketWatchlist.DTOs;

namespace PolymarketWatchlist.Services;

/// <summary>
/// Thin wrapper around Polymarket's public Gamma and CLOB APIs.
/// </summary>
public class PolymarketService
{
    private readonly HttpClient _http;
    private readonly ILogger<PolymarketService> _log;

    private static readonly JsonSerializerOptions _jsonOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public PolymarketService(HttpClient http, ILogger<PolymarketService> log)
    {
        _http = http;
        _log = log;
    }

    // -----------------------------------------------------------------------
    // Gamma – search markets
    // -----------------------------------------------------------------------
    /// <summary>
    /// Calls GET https://gamma-api.polymarket.com/public-search?q={query}
    ///
    /// Real response shape:
    /// {
    ///   "events": [ { "markets": [ { market object }, ... ] }, ... ],
    ///   "tags":   [...],
    ///   "profiles": [...],
    ///   "pagination": { "hasMore": bool, "totalResults": int }
    /// }
    ///
    /// Markets are nested inside events. Each market has:
    ///   - clobTokenIds : JSON-stringified string[] e.g. "[\"12345\",\"67890\"]"
    ///   - outcomes     : JSON-stringified string[] e.g. "[\"YES\",\"NO\"]"
    /// </summary>
    public async Task<List<GammaMarketSummary>> SearchMarketsAsync(string query)
    {
        var url = $"https://gamma-api.polymarket.com/public-search?q={Uri.EscapeDataString(query)}";
        var json = await _http.GetStringAsync(url);
        var root = JsonNode.Parse(json);

        var results = new List<GammaMarketSummary>();

        // Markets are nested under events[].markets[]
        var events = root?["events"] as JsonArray;
        if (events == null) return results;

        foreach (var ev in events)
        {
            var markets = ev?["markets"] as JsonArray;
            if (markets == null) continue;
            foreach (var mkt in markets)
            {
                var summary = ParseMarketNode(mkt);
                if (summary != null) results.Add(summary);
            }
        }
        return results;
    }

    // -----------------------------------------------------------------------
    // Gamma – fetch single market to extract token IDs
    // -----------------------------------------------------------------------
    /// <summary>
    /// Calls GET https://gamma-api.polymarket.com/markets/{id}
    /// and extracts YES/NO token IDs from the "tokens" array.
    ///
    /// Example response fragment:
    /// {
    ///   "id": "0xabc123",
    ///   "question": "Will BTC …?",
    ///   "tokens": [
    ///     { "token_id": "12345", "outcome": "YES" },
    ///     { "token_id": "67890", "outcome": "NO" }
    ///   ]
    /// }
    /// </summary>
    public async Task<GammaMarketSummary?> GetMarketAsync(string marketId)
    {
        var url = $"https://gamma-api.polymarket.com/markets/{Uri.EscapeDataString(marketId)}";
        try
        {
            var json = await _http.GetStringAsync(url);
            var node = JsonNode.Parse(json);
            return ParseMarketNode(node);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Failed to fetch Gamma market {MarketId}", marketId);
            return null;
        }
    }

    // -----------------------------------------------------------------------
    // CLOB – batch mid-prices
    // -----------------------------------------------------------------------
    /// <summary>
    /// Calls POST https://clob.polymarket.com/midpoints
    /// with a JSON body containing an array of { token_id: "..." } objects.
    /// Returns a dictionary of tokenId -> midPrice.
    ///
    /// CLOB response is a flat map:
    ///   { "12345": "0.65", "67890": "0.35" }
    /// </summary>
    public async Task<Dictionary<string, decimal>> GetMidpointsAsync(IEnumerable<string> tokenIds)
    {
        var tokenIdList = tokenIds.ToList();
        if (tokenIdList.Count == 0) return new Dictionary<string, decimal>();

        var url = "https://clob.polymarket.com/midpoints";
        try
        {
            var requestBody = tokenIdList.Select(id => new { token_id = id }).ToArray();
            var jsonContent = JsonSerializer.Serialize(requestBody, _jsonOpts);
            var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

            var response = await _http.PostAsync(url, content);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();
            var root = JsonNode.Parse(json);
            if (root is not JsonObject obj)
                return new Dictionary<string, decimal>();

            var result = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
            foreach (var (key, val) in obj)
            {
                var priceStr = val?.GetValue<string>();
                if (priceStr != null && decimal.TryParse(priceStr, out var price))
                    result[key] = price;
            }
            return result;
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Failed to fetch CLOB midpoints for {Count} tokens", tokenIdList.Count);
            return new Dictionary<string, decimal>();
        }
    }

    // -----------------------------------------------------------------------
    // Helper
    // -----------------------------------------------------------------------
    /// <summary>
    /// Parses a Gamma Market JSON node into GammaMarketSummary.
    ///
    /// Real Gamma market shape (relevant fields):
    /// {
    ///   "id":           "12345",          -- numeric-string or int
    ///   "conditionId":  "0xabc...",
    ///   "question":     "Will BTC …?",
    ///   "slug":         "will-btc-...",
    ///   "clobTokenIds": "[\"111\",\"222\"]", -- JSON-stringified string[]
    ///   "outcomes":     "[\"YES\",\"NO\"]"   -- JSON-stringified string[]
    /// }
    /// Token index in clobTokenIds matches outcome index in outcomes.
    /// </summary>
    private static GammaMarketSummary? ParseMarketNode(JsonNode? node)
    {
        if (node == null) return null;

        var id = node["id"]?.GetValue<string>()
              ?? node["id"]?.GetValue<long>().ToString()
              ?? node["conditionId"]?.GetValue<string>() ?? "";
        var question = node["question"]?.GetValue<string>() ?? "";
        var slug     = node["slug"]?.GetValue<string>() ?? "";

        // clobTokenIds is a JSON-stringified array: "[\"111\",\"222\"]"
        var clobTokenIdsRaw = node["clobTokenIds"]?.GetValue<string>() ?? "[]";
        // outcomes is a JSON-stringified array: "[\"YES\",\"NO\"]"
        var outcomesRaw = node["outcomes"]?.GetValue<string>() ?? "[]";

        string[] tokenIds = new string[0];
        string[] outcomes = new string[0];

        try { tokenIds = JsonSerializer.Deserialize<string[]>(clobTokenIdsRaw) ?? []; } catch { }
        try { outcomes = JsonSerializer.Deserialize<string[]>(outcomesRaw)     ?? []; } catch { }

        var yesTokenId = "";
        var noTokenId  = "";

        for (int i = 0; i < outcomes.Length && i < tokenIds.Length; i++)
        {
            if (outcomes[i].Equals("YES", StringComparison.OrdinalIgnoreCase))
                yesTokenId = tokenIds[i];
            else if (outcomes[i].Equals("NO", StringComparison.OrdinalIgnoreCase))
                noTokenId = tokenIds[i];
        }

        if (string.IsNullOrEmpty(id) || string.IsNullOrEmpty(yesTokenId))
            return null;

        return new GammaMarketSummary(id, question, slug, yesTokenId, noTokenId);
    }
}
