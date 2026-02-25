# Polymarket Watchlist & Alerts — MVP

## Prerequisites

| Tool | Version |
|------|---------|
| .NET SDK | 8.0+ |
| SQL Server | 2019+ (or LocalDB) |
| Node.js | 18+ |
| npm | 9+ |

---

## 1 — Database setup

Open SSMS (or `sqlcmd`) and run:

```sql
CREATE DATABASE PolymarketWatchlist;
GO
USE PolymarketWatchlist;
GO
```

Then paste and run the contents of **`schema.sql`** from the repo root.

> **Or** skip this step and let EF Core create the schema automatically on first run
> (the backend calls `db.Database.EnsureCreated()` at startup).

---

## 2 — Backend (ASP.NET Core 8)

```powershell
cd server

# Restore packages
dotnet restore

# (Optional) adjust connection string in appsettings.json
# Default: Server=localhost;Database=PolymarketWatchlist;Trusted_Connection=True;TrustServerCertificate=True;

# Run on port 5000
dotnet run --urls "http://localhost:5000"
```

Swagger UI: http://localhost:5000/swagger

---

## 3 — Frontend (React + Vite)

```powershell
cd client
npm install
npm run dev
```

App: http://localhost:5173

Vite proxies all `/api/*` requests to `http://localhost:5000`, so no CORS issues during dev.

---

## Usage walkthrough

1. **Create a watchlist** — home page, type a name and click `+ Create`.
2. **Add markets** — open a watchlist → `+ Add Market` → search Polymarket (e.g. "bitcoin") → click `Add` next to any result.
3. **Set a rule** — in the watchlist table, click `Set rule` on a row → enter a LOW and HIGH percentage → `Save Rule`.
4. **View live odds** — the table auto-refreshes every 30 s. The `YES%` / `NO%` columns show current mid-prices. The `In Range` column shows a green badge when the YES price is inside your threshold window.
5. **Filter** — tick `In-range only` to see only flagged markets. Use the sort dropdown to sort by YES% or flagged-first.

---

## Project structure

```
/
├── ARCHITECTURE.md         ← diagrams + Polymarket API notes
├── schema.sql              ← raw CREATE TABLE statements
│
├── server/                 ← ASP.NET Core 8 Web API
│   ├── PolymarketWatchlist.csproj
│   ├── Program.cs
│   ├── appsettings.json
│   ├── Models/             ← EF Core entity classes
│   ├── DTOs/               ← Request/Response records
│   ├── Data/               ← AppDbContext
│   ├── Services/           ← PolymarketService (Gamma + CLOB HTTP)
│   ├── BackgroundServices/ ← PricePollingService (every 20 s)
│   └── Controllers/        ← SearchController, WatchlistsController, RulesController
│
└── client/                 ← React + Vite + TypeScript + Tailwind
    ├── index.html
    ├── vite.config.ts
    ├── tailwind.config.js
    └── src/
        ├── main.tsx
        ├── App.tsx          ← routing
        ├── api.ts           ← axios wrappers + TypeScript types
        └── pages/
            ├── WatchlistsPage.tsx      ← list + create watchlists
            ├── WatchlistDetailPage.tsx ← market table, polling, filter/sort
            ├── AddMarketPage.tsx       ← Gamma search + add to watchlist
            └── RulesPage.tsx           ← create/edit/delete threshold rule
```

---

## API reference

| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/search?q= | Proxy Polymarket Gamma search |
| GET | /api/watchlists | List all watchlists |
| POST | /api/watchlists | Create watchlist `{ name }` |
| POST | /api/watchlists/{id}/markets | Add market `{ marketId, question, yesTokenId, noTokenId }` |
| GET | /api/watchlists/{id}/view?inRangeOnly=&sort= | Enriched market rows |
| POST | /api/rules | Create/replace rule `{ watchlistMarketId, lowThreshold, highThreshold }` |
| DELETE | /api/rules/{id} | Delete rule |

---

## How prices work

```
BackgroundService (every 20 s)
  └─ Load all WatchlistMarkets from DB
  └─ Collect all YES + NO tokenIds
  └─ GET https://clob.polymarket.com/midpoints?token_ids=id1,id2,...
  └─ Upsert LatestPrice table
  └─ For each Rule: evaluate IsInRange  →  upsert FlagState

React (every 30 s)
  └─ GET /api/watchlists/{id}/view
  └─ Backend joins WatchlistMarket + LatestPrice + FlagState + Rule
  └─ Returns enriched rows
```

Prices are therefore at most ~20 s stale on the server and ~30 s stale on the client.
