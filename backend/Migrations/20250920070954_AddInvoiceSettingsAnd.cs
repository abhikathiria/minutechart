using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddInvoiceSettingsAnd : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InvoiceColumnSettings_CompanyInvoiceSettings_InvoiceSettingsId",
                table: "InvoiceColumnSettings");

            migrationBuilder.RenameColumn(
                name: "InvoiceSettingsId",
                table: "InvoiceColumnSettings",
                newName: "CompanyInvoiceSettingId");

            migrationBuilder.RenameIndex(
                name: "IX_InvoiceColumnSettings_InvoiceSettingsId",
                table: "InvoiceColumnSettings",
                newName: "IX_InvoiceColumnSettings_CompanyInvoiceSettingId");

            migrationBuilder.AddForeignKey(
                name: "FK_InvoiceColumnSettings_CompanyInvoiceSettings_CompanyInvoiceSettingId",
                table: "InvoiceColumnSettings",
                column: "CompanyInvoiceSettingId",
                principalTable: "CompanyInvoiceSettings",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InvoiceColumnSettings_CompanyInvoiceSettings_CompanyInvoiceSettingId",
                table: "InvoiceColumnSettings");

            migrationBuilder.RenameColumn(
                name: "CompanyInvoiceSettingId",
                table: "InvoiceColumnSettings",
                newName: "InvoiceSettingsId");

            migrationBuilder.RenameIndex(
                name: "IX_InvoiceColumnSettings_CompanyInvoiceSettingId",
                table: "InvoiceColumnSettings",
                newName: "IX_InvoiceColumnSettings_InvoiceSettingsId");

            migrationBuilder.AddForeignKey(
                name: "FK_InvoiceColumnSettings_CompanyInvoiceSettings_InvoiceSettingsId",
                table: "InvoiceColumnSettings",
                column: "InvoiceSettingsId",
                principalTable: "CompanyInvoiceSettings",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
