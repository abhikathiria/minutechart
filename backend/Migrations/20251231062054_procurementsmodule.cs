using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class procurementsmodule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProcurementsMains",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AppUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    QueryText = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PrimaryKeyColumn = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    InsertQuery = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdateQuery = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    VisualizationType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    QueryCreatedAtTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    QueryLastUpdated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UserIpAddress = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastRefreshedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CachedJsonData = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProcurementsMains", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProcurementsMains_AspNetUsers_AppUserId",
                        column: x => x.AppUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProcurementsPurchaseOrders",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AppUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    QueryText = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PrimaryKeyColumn = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    InsertQuery = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdateQuery = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    VisualizationType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    QueryCreatedAtTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    QueryLastUpdated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UserIpAddress = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastRefreshedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CachedJsonData = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProcurementsPurchaseOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProcurementsPurchaseOrders_AspNetUsers_AppUserId",
                        column: x => x.AppUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProcurementsPurchaseReturns",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AppUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    QueryText = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PrimaryKeyColumn = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    InsertQuery = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdateQuery = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    VisualizationType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    QueryCreatedAtTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    QueryLastUpdated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UserIpAddress = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastRefreshedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CachedJsonData = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProcurementsPurchaseReturns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProcurementsPurchaseReturns_AspNetUsers_AppUserId",
                        column: x => x.AppUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProcurementsQuotes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AppUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    QueryText = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PrimaryKeyColumn = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    InsertQuery = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdateQuery = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    VisualizationType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    QueryCreatedAtTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    QueryLastUpdated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UserIpAddress = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastRefreshedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CachedJsonData = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProcurementsQuotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProcurementsQuotes_AspNetUsers_AppUserId",
                        column: x => x.AppUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProcurementsReports",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AppUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    QueryText = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PrimaryKeyColumn = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    InsertQuery = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdateQuery = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    VisualizationType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    QueryCreatedAtTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    QueryLastUpdated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UserIpAddress = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastRefreshedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CachedJsonData = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProcurementsReports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProcurementsReports_AspNetUsers_AppUserId",
                        column: x => x.AppUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProcurementsRequirements",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AppUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    QueryText = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PrimaryKeyColumn = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    InsertQuery = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdateQuery = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    VisualizationType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    QueryCreatedAtTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    QueryLastUpdated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UserIpAddress = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastRefreshedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CachedJsonData = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProcurementsRequirements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProcurementsRequirements_AspNetUsers_AppUserId",
                        column: x => x.AppUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProcurementsMains_AppUserId",
                table: "ProcurementsMains",
                column: "AppUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProcurementsPurchaseOrders_AppUserId",
                table: "ProcurementsPurchaseOrders",
                column: "AppUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProcurementsPurchaseReturns_AppUserId",
                table: "ProcurementsPurchaseReturns",
                column: "AppUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProcurementsQuotes_AppUserId",
                table: "ProcurementsQuotes",
                column: "AppUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProcurementsReports_AppUserId",
                table: "ProcurementsReports",
                column: "AppUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProcurementsRequirements_AppUserId",
                table: "ProcurementsRequirements",
                column: "AppUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProcurementsMains");

            migrationBuilder.DropTable(
                name: "ProcurementsPurchaseOrders");

            migrationBuilder.DropTable(
                name: "ProcurementsPurchaseReturns");

            migrationBuilder.DropTable(
                name: "ProcurementsQuotes");

            migrationBuilder.DropTable(
                name: "ProcurementsReports");

            migrationBuilder.DropTable(
                name: "ProcurementsRequirements");
        }
    }
}
