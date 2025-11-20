using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class admincomissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CommissionBills",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AppUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    AdminName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FromDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ToDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TotalCommission = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ApprovedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PaidAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CommissionBills", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CommissionBills_AspNetUsers_AppUserId",
                        column: x => x.AppUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CommissionBillItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CommissionBillId = table.Column<int>(type: "int", nullable: false),
                    AppUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    CompanyName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CustomerName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PurchaseId = table.Column<int>(type: "int", nullable: false),
                    PlanName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    CommissionPercentage = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    CommissionAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    PurchasedOn = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CommissionBillItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CommissionBillItems_AspNetUsers_AppUserId",
                        column: x => x.AppUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CommissionBillItems_CommissionBills_CommissionBillId",
                        column: x => x.CommissionBillId,
                        principalTable: "CommissionBills",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CommissionBillItems_AppUserId",
                table: "CommissionBillItems",
                column: "AppUserId");

            migrationBuilder.CreateIndex(
                name: "IX_CommissionBillItems_CommissionBillId",
                table: "CommissionBillItems",
                column: "CommissionBillId");

            migrationBuilder.CreateIndex(
                name: "IX_CommissionBills_AppUserId",
                table: "CommissionBills",
                column: "AppUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CommissionBillItems");

            migrationBuilder.DropTable(
                name: "CommissionBills");
        }
    }
}
