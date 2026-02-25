-- ============================================================
-- Polymarket Watchlist & Alerts — SQL Server Schema
-- Run against your database before starting the API.
-- ============================================================

CREATE TABLE Watchlist (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    Name        NVARCHAR(200) NOT NULL,
    CreatedAt   DATETIME2     NOT NULL DEFAULT GETUTCDATE()
);

-- One row per market added to a watchlist.
-- yesTokenId / noTokenId come from the Gamma /markets/{id} response.
CREATE TABLE WatchlistMarket (
    Id              INT IDENTITY(1,1) PRIMARY KEY,
    WatchlistId     INT            NOT NULL REFERENCES Watchlist(Id) ON DELETE CASCADE,
    MarketId        NVARCHAR(100)  NOT NULL,   -- Polymarket market slug/id
    Question        NVARCHAR(500)  NOT NULL,
    YesTokenId      NVARCHAR(100)  NOT NULL,
    NoTokenId       NVARCHAR(100)  NOT NULL,
    AddedAt         DATETIME2      NOT NULL DEFAULT GETUTCDATE()
);

-- Threshold rules: flag when YES price is between Lo and Hi.
CREATE TABLE Rule (
    Id                  INT IDENTITY(1,1) PRIMARY KEY,
    WatchlistMarketId   INT            NOT NULL REFERENCES WatchlistMarket(Id) ON DELETE CASCADE,
    LowThreshold        DECIMAL(5,4)   NOT NULL,   -- e.g. 0.62
    HighThreshold       DECIMAL(5,4)   NOT NULL,   -- e.g. 0.68
    CreatedAt           DATETIME2      NOT NULL DEFAULT GETUTCDATE()
);

-- Latest mid-price for any token (YES or NO).
-- Keyed on TokenId; upserted by the BackgroundService every ~20 s.
CREATE TABLE LatestPrice (
    TokenId     NVARCHAR(100) PRIMARY KEY,
    MidPrice    DECIMAL(10,6) NOT NULL,
    UpdatedAt   DATETIME2     NOT NULL DEFAULT GETUTCDATE()
);

-- Whether the YES price for a WatchlistMarket is currently in-range for its Rule.
CREATE TABLE FlagState (
    WatchlistMarketId   INT     NOT NULL PRIMARY KEY REFERENCES WatchlistMarket(Id) ON DELETE CASCADE,
    IsInRange           BIT     NOT NULL DEFAULT 0,
    CheckedAt           DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Helpful indexes
CREATE INDEX IX_WatchlistMarket_WatchlistId ON WatchlistMarket(WatchlistId);
CREATE INDEX IX_Rule_WatchlistMarketId      ON Rule(WatchlistMarketId);
