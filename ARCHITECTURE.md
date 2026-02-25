# Polymarket Watchlist & Alerts — Architecture

## Overview

```
┌──────────────────────────────────────────────────────────────┐
│  React (Vite + TS)                                           │
│  - Watchlists page, Add-Market search, Rules editor          │
│  - Polls GET /api/watchlists/{id}/view every 30 s            │
│  - axios for all API calls                                   │
└───────────────┬──────────────────────────────────────────────┘
                │ HTTP (JSON)
┌───────────────▼──────────────────────────────────────────────┐
│  ASP.NET Core 8 Web API (C#)                                 │
│  Controllers:                                                 │
│    GET  /api/search?q=          → proxies Gamma API          │
│    POST /api/watchlists         → create watchlist           │
│    POST /api/watchlists/{id}/markets → add market            │
│    POST /api/rules              → create threshold rule      │
│    GET  /api/watchlists/{id}/view → returns enriched rows    │
│                                                              │
│  BackgroundService (every 20 s):                            │
│    1. Load all WatchlistMarkets                              │
│    2. Batch-call CLOB /midpoints for all token IDs           │
│    3. Upsert LatestPrice table                               │
│    4. Evaluate each Rule → upsert FlagState table            │
└──────┬───────────────────────────────────┬───────────────────┘
       │ HttpClient                         │ EF Core
       │                                    │
┌──────▼──────────────────┐   ┌────────────▼───────────────────┐
│  Polymarket APIs         │   │  SQL Server                   │
│  Gamma (search/market)   │   │  Watchlist                    │
│  CLOB  (midpoints)       │   │  WatchlistMarket              │
└─────────────────────────┘   │  Rule                         │
                               │  LatestPrice                  │
                               │  FlagState                    │
                               └───────────────────────────────┘
```

## Data Flow

1. **Search**: React → `GET /api/search?q=bitcoin` → backend calls Gamma `/public-search?q=bitcoin` → returns market list.
2. **Add market**: React → `POST /api/watchlists/{id}/markets` with `{ marketId, question, yesTokenId, noTokenId }` → stored in `WatchlistMarket`.
3. **Polling (server)**: `PricePollingService` wakes every 20 s, collects all token IDs, calls `GET https://clob.polymarket.com/midpoints?token_ids=id1,id2,...`, upserts `LatestPrice`, then evaluates every `Rule` against those prices and upserts `FlagState`.
4. **View**: React calls `GET /api/watchlists/{id}/view` every 30 s → backend joins `WatchlistMarket + LatestPrice + FlagState + Rule` → returns enriched rows ready to render.

## Gamma market JSON (example, relevant fields)

```json
{
  "id": "0xabc123",
  "question": "Will BTC exceed $100k by Dec 2025?",
  "tokens": [
    { "token_id": "12345", "outcome": "YES" },
    { "token_id": "67890", "outcome": "NO"  }
  ]
}
```
The backend extracts `tokens[outcome=YES].token_id` and `tokens[outcome=NO].token_id` when the market is added.
