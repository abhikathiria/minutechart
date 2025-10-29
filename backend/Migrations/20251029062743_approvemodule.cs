using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class approvemodule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ApprovalIdColumn",
                table: "UserQueries",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ApprovalUpdateQuery",
                table: "UserQueries",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "IsApprovalModule",
                table: "UserQueries",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApprovalIdColumn",
                table: "UserQueries");

            migrationBuilder.DropColumn(
                name: "ApprovalUpdateQuery",
                table: "UserQueries");

            migrationBuilder.DropColumn(
                name: "IsApprovalModule",
                table: "UserQueries");
        }
    }
}
