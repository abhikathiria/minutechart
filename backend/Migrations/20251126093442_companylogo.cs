using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class companylogo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RefreshTime",
                table: "UserProfiles");

            migrationBuilder.AddColumn<string>(
                name: "CompanyLogoUrl",
                table: "UserProfiles",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CompanyLogoUrl",
                table: "UserProfiles");

            migrationBuilder.AddColumn<int>(
                name: "RefreshTime",
                table: "UserProfiles",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }
    }
}
