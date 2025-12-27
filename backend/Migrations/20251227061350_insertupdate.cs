using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class insertupdate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "InsertQuery",
                table: "CatalogProducts",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PrimaryKeyColumn",
                table: "CatalogProducts",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UpdateQuery",
                table: "CatalogProducts",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InsertQuery",
                table: "CatalogProducts");

            migrationBuilder.DropColumn(
                name: "PrimaryKeyColumn",
                table: "CatalogProducts");

            migrationBuilder.DropColumn(
                name: "UpdateQuery",
                table: "CatalogProducts");
        }
    }
}
