using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddBAnkDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "BankDetailsJson",
                table: "CompanyInvoiceSettings",
                newName: "IFSC");

            migrationBuilder.AddColumn<string>(
                name: "BankAccountNumber",
                table: "CompanyInvoiceSettings",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BankName",
                table: "CompanyInvoiceSettings",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BranchName",
                table: "CompanyInvoiceSettings",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BankAccountNumber",
                table: "CompanyInvoiceSettings");

            migrationBuilder.DropColumn(
                name: "BankName",
                table: "CompanyInvoiceSettings");

            migrationBuilder.DropColumn(
                name: "BranchName",
                table: "CompanyInvoiceSettings");

            migrationBuilder.RenameColumn(
                name: "IFSC",
                table: "CompanyInvoiceSettings",
                newName: "BankDetailsJson");
        }
    }
}
