using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddOrde : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CompanyInvoiceSettings_RazorpayOrders_OrderId",
                table: "CompanyInvoiceSettings");

            migrationBuilder.DropIndex(
                name: "IX_CompanyInvoiceSettings_OrderId",
                table: "CompanyInvoiceSettings");

            migrationBuilder.DropColumn(
                name: "OrderId",
                table: "CompanyInvoiceSettings");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "OrderId",
                table: "CompanyInvoiceSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_CompanyInvoiceSettings_OrderId",
                table: "CompanyInvoiceSettings",
                column: "OrderId");

            migrationBuilder.AddForeignKey(
                name: "FK_CompanyInvoiceSettings_RazorpayOrders_OrderId",
                table: "CompanyInvoiceSettings",
                column: "OrderId",
                principalTable: "RazorpayOrders",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
