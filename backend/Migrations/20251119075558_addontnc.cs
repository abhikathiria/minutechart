using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class addontnc : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AddonTermsAndConditions",
                table: "CompanyInvoiceSettings",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "ShowAddonTermsAndConditions",
                table: "CompanyInvoiceSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AddonTermsAndConditions",
                table: "CompanyInvoiceSettings");

            migrationBuilder.DropColumn(
                name: "ShowAddonTermsAndConditions",
                table: "CompanyInvoiceSettings");
        }
    }
}
