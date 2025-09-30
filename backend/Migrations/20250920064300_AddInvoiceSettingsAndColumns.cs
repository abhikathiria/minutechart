using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddInvoiceSettingsAndColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ComapnyInvoiceSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CompanyLogoPath = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CompanyName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CompanyAddress = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CompanyPhone = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CompanyEmail = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CompanyWebsite = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    GstNumber = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OwnerName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OwnerSignaturePath = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    BankDetailsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PayableTo = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OtherDetails = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CgstPercent = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    SgstPercent = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ShowGst = table.Column<bool>(type: "bit", nullable: false),
                    ShowBankDetails = table.Column<bool>(type: "bit", nullable: false),
                    ShowWebsite = table.Column<bool>(type: "bit", nullable: false),
                    ShowSignature = table.Column<bool>(type: "bit", nullable: false),
                    ShowNotes = table.Column<bool>(type: "bit", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ComapnyInvoiceSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "InvoiceColumnSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InvoiceSettingsId = table.Column<int>(type: "int", nullable: false),
                    ColumnKey = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ColumnName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsVisible = table.Column<bool>(type: "bit", nullable: false),
                    Order = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InvoiceColumnSettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InvoiceColumnSettings_ComapnyInvoiceSettings_InvoiceSettingsId",
                        column: x => x.InvoiceSettingsId,
                        principalTable: "ComapnyInvoiceSettings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_InvoiceColumnSettings_InvoiceSettingsId",
                table: "InvoiceColumnSettings",
                column: "InvoiceSettingsId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "InvoiceColumnSettings");

            migrationBuilder.DropTable(
                name: "ComapnyInvoiceSettings");
        }
    }
}
