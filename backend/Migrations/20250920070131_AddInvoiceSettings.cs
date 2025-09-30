using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddInvoiceSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InvoiceColumnSettings_ComapnyInvoiceSettings_InvoiceSettingsId",
                table: "InvoiceColumnSettings");

            migrationBuilder.DropPrimaryKey(
                name: "PK_ComapnyInvoiceSettings",
                table: "ComapnyInvoiceSettings");

            migrationBuilder.RenameTable(
                name: "ComapnyInvoiceSettings",
                newName: "CompanyInvoiceSettings");

            migrationBuilder.RenameColumn(
                name: "Order",
                table: "InvoiceColumnSettings",
                newName: "SortOrder");

            migrationBuilder.AddPrimaryKey(
                name: "PK_CompanyInvoiceSettings",
                table: "CompanyInvoiceSettings",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_InvoiceColumnSettings_CompanyInvoiceSettings_InvoiceSettingsId",
                table: "InvoiceColumnSettings",
                column: "InvoiceSettingsId",
                principalTable: "CompanyInvoiceSettings",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InvoiceColumnSettings_CompanyInvoiceSettings_InvoiceSettingsId",
                table: "InvoiceColumnSettings");

            migrationBuilder.DropPrimaryKey(
                name: "PK_CompanyInvoiceSettings",
                table: "CompanyInvoiceSettings");

            migrationBuilder.RenameTable(
                name: "CompanyInvoiceSettings",
                newName: "ComapnyInvoiceSettings");

            migrationBuilder.RenameColumn(
                name: "SortOrder",
                table: "InvoiceColumnSettings",
                newName: "Order");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ComapnyInvoiceSettings",
                table: "ComapnyInvoiceSettings",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_InvoiceColumnSettings_ComapnyInvoiceSettings_InvoiceSettingsId",
                table: "InvoiceColumnSettings",
                column: "InvoiceSettingsId",
                principalTable: "ComapnyInvoiceSettings",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
