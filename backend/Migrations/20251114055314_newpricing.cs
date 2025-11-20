using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class newpricing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Pricings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MonthlyPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    AnnualPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    DashboardLimit = table.Column<int>(type: "int", nullable: false),
                    RefreshRateMinutes = table.Column<int>(type: "int", nullable: false),
                    ExcelExport = table.Column<bool>(type: "bit", nullable: false),
                    PrioritySupport = table.Column<bool>(type: "bit", nullable: false),
                    DashboardAddonEnabled = table.Column<bool>(type: "bit", nullable: false),
                    AddonPrice = table.Column<int>(type: "int", nullable: false),
                    AddonDashboards = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Pricings", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Pricings");
        }
    }
}
