using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class adminpayment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PayoutId",
                table: "CommissionBills",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PayoutMode",
                table: "CommissionBills",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PayoutStatus",
                table: "CommissionBills",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ResellerPaymentDetails",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AppUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    AccountHolderName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BankAccountNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IFSC = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpiId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RazorpayContactId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RazorpayFundAccountId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResellerPaymentDetails", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ResellerPaymentDetails_AspNetUsers_AppUserId",
                        column: x => x.AppUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ResellerPaymentDetails_AppUserId",
                table: "ResellerPaymentDetails",
                column: "AppUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ResellerPaymentDetails");

            migrationBuilder.DropColumn(
                name: "PayoutId",
                table: "CommissionBills");

            migrationBuilder.DropColumn(
                name: "PayoutMode",
                table: "CommissionBills");

            migrationBuilder.DropColumn(
                name: "PayoutStatus",
                table: "CommissionBills");
        }
    }
}
