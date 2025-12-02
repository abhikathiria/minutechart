using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class financemodule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FinanceModules",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AppUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ComponentId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ModuleTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SqlQuery = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastUpdated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UserIpAddress = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    HideQuery = table.Column<bool>(type: "bit", nullable: false),
                    LastRefreshedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CachedJsonData = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FinanceModules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FinanceModules_AspNetUsers_AppUserId",
                        column: x => x.AppUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FinanceModules_AppUserId_ComponentId",
                table: "FinanceModules",
                columns: new[] { "AppUserId", "ComponentId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FinanceModules");
        }
    }
}
