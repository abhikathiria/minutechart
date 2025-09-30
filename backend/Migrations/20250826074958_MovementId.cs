using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class MovementId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_CashMovements",
                table: "CashMovements");

            migrationBuilder.AddColumn<int>(
                name: "MovementID",
                table: "CashMovements",
                type: "int",
                nullable: false,
                defaultValue: 0)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddPrimaryKey(
                name: "PK_CashMovements",
                table: "CashMovements",
                column: "MovementID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_CashMovements",
                table: "CashMovements");

            migrationBuilder.DropColumn(
                name: "MovementID",
                table: "CashMovements");

            migrationBuilder.AddPrimaryKey(
                name: "PK_CashMovements",
                table: "CashMovements",
                column: "MovementDate");
        }
    }
}
