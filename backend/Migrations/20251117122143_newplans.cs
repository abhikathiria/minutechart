using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class newplans : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "TierOrder",
                table: "Pricings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "PlanInvoices",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AppUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    PlanId = table.Column<int>(type: "int", nullable: false),
                    RazorpayOrderId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RazorpayPaymentId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PaymentDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    InvoiceNumber = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PlanStartDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PlanEndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PdfPath = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BillingCycle = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ProrationCredit = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    NetAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlanInvoices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PlanInvoices_AspNetUsers_AppUserId",
                        column: x => x.AppUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PlanInvoices_Pricings_PlanId",
                        column: x => x.PlanId,
                        principalTable: "Pricings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PlannedSubscriptionChanges",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AppUserId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    NewPlanId = table.Column<int>(type: "int", nullable: false),
                    BillingCycle = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EffectiveDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ActionType = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlannedSubscriptionChanges", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RazorpayPlanOrders",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrderId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PaymentId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AppUserId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PlanId = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PaidAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    BillingCycle = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Intent = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ProrationCredit = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RazorpayPlanOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RazorpayPlanOrders_Pricings_PlanId",
                        column: x => x.PlanId,
                        principalTable: "Pricings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserAddons",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AppUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    PricingId = table.Column<int>(type: "int", nullable: false),
                    Dashboards = table.Column<int>(type: "int", nullable: false),
                    Price = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserAddons", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserAddons_AspNetUsers_AppUserId",
                        column: x => x.AppUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserAddons_Pricings_PricingId",
                        column: x => x.PricingId,
                        principalTable: "Pricings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PlanInvoices_AppUserId",
                table: "PlanInvoices",
                column: "AppUserId");

            migrationBuilder.CreateIndex(
                name: "IX_PlanInvoices_PlanId",
                table: "PlanInvoices",
                column: "PlanId");

            migrationBuilder.CreateIndex(
                name: "IX_RazorpayPlanOrders_PlanId",
                table: "RazorpayPlanOrders",
                column: "PlanId");

            migrationBuilder.CreateIndex(
                name: "IX_UserAddons_AppUserId",
                table: "UserAddons",
                column: "AppUserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserAddons_PricingId",
                table: "UserAddons",
                column: "PricingId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PlanInvoices");

            migrationBuilder.DropTable(
                name: "PlannedSubscriptionChanges");

            migrationBuilder.DropTable(
                name: "RazorpayPlanOrders");

            migrationBuilder.DropTable(
                name: "UserAddons");

            migrationBuilder.DropColumn(
                name: "TierOrder",
                table: "Pricings");
        }
    }
}
