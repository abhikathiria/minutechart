using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class addoninvoice : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AddonInvoices",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AppUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    PricingId = table.Column<int>(type: "int", nullable: false),
                    RazorpayOrderId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RazorpayPaymentId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PaymentDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    InvoiceNumber = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Dashboards = table.Column<int>(type: "int", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PdfPath = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AddonInvoices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AddonInvoices_AspNetUsers_AppUserId",
                        column: x => x.AppUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AddonInvoices_Pricings_PricingId",
                        column: x => x.PricingId,
                        principalTable: "Pricings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RazorpayAddonOrders",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrderId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PaymentId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AppUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    PricingId = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PaidAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RazorpayAddonOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RazorpayAddonOrders_AspNetUsers_AppUserId",
                        column: x => x.AppUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RazorpayAddonOrders_Pricings_PricingId",
                        column: x => x.PricingId,
                        principalTable: "Pricings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AddonInvoices_AppUserId",
                table: "AddonInvoices",
                column: "AppUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AddonInvoices_PricingId",
                table: "AddonInvoices",
                column: "PricingId");

            migrationBuilder.CreateIndex(
                name: "IX_RazorpayAddonOrders_AppUserId",
                table: "RazorpayAddonOrders",
                column: "AppUserId");

            migrationBuilder.CreateIndex(
                name: "IX_RazorpayAddonOrders_PricingId",
                table: "RazorpayAddonOrders",
                column: "PricingId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AddonInvoices");

            migrationBuilder.DropTable(
                name: "RazorpayAddonOrders");
        }
    }
}
