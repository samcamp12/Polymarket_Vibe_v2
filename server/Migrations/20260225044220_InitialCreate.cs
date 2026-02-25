using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PolymarketWatchlist.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LatestPrice",
                columns: table => new
                {
                    TokenId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    MidPrice = table.Column<decimal>(type: "decimal(10,6)", precision: 10, scale: 6, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LatestPrice", x => x.TokenId);
                });

            migrationBuilder.CreateTable(
                name: "Watchlist",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Watchlist", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WatchlistMarket",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    WatchlistId = table.Column<int>(type: "int", nullable: false),
                    MarketId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Question = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    YesTokenId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    NoTokenId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    AddedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    YesPriceTokenId = table.Column<string>(type: "nvarchar(100)", nullable: true),
                    NoPriceTokenId = table.Column<string>(type: "nvarchar(100)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WatchlistMarket", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WatchlistMarket_LatestPrice_NoPriceTokenId",
                        column: x => x.NoPriceTokenId,
                        principalTable: "LatestPrice",
                        principalColumn: "TokenId");
                    table.ForeignKey(
                        name: "FK_WatchlistMarket_LatestPrice_YesPriceTokenId",
                        column: x => x.YesPriceTokenId,
                        principalTable: "LatestPrice",
                        principalColumn: "TokenId");
                    table.ForeignKey(
                        name: "FK_WatchlistMarket_Watchlist_WatchlistId",
                        column: x => x.WatchlistId,
                        principalTable: "Watchlist",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FlagState",
                columns: table => new
                {
                    WatchlistMarketId = table.Column<int>(type: "int", nullable: false),
                    IsInRange = table.Column<bool>(type: "bit", nullable: false),
                    CheckedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FlagState", x => x.WatchlistMarketId);
                    table.ForeignKey(
                        name: "FK_FlagState_WatchlistMarket_WatchlistMarketId",
                        column: x => x.WatchlistMarketId,
                        principalTable: "WatchlistMarket",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Rule",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    WatchlistMarketId = table.Column<int>(type: "int", nullable: false),
                    LowThreshold = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    HighThreshold = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Rule", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Rule_WatchlistMarket_WatchlistMarketId",
                        column: x => x.WatchlistMarketId,
                        principalTable: "WatchlistMarket",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Rule_WatchlistMarketId",
                table: "Rule",
                column: "WatchlistMarketId");

            migrationBuilder.CreateIndex(
                name: "IX_WatchlistMarket_NoPriceTokenId",
                table: "WatchlistMarket",
                column: "NoPriceTokenId");

            migrationBuilder.CreateIndex(
                name: "IX_WatchlistMarket_WatchlistId",
                table: "WatchlistMarket",
                column: "WatchlistId");

            migrationBuilder.CreateIndex(
                name: "IX_WatchlistMarket_YesPriceTokenId",
                table: "WatchlistMarket",
                column: "YesPriceTokenId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FlagState");

            migrationBuilder.DropTable(
                name: "Rule");

            migrationBuilder.DropTable(
                name: "WatchlistMarket");

            migrationBuilder.DropTable(
                name: "LatestPrice");

            migrationBuilder.DropTable(
                name: "Watchlist");
        }
    }
}
