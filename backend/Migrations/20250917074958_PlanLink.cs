using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class PlanLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_RazorpayOrders_PlanId",
                table: "RazorpayOrders",
                column: "PlanId");

            migrationBuilder.AddForeignKey(
                name: "FK_RazorpayOrders_SubscriptionPlans_PlanId",
                table: "RazorpayOrders",
                column: "PlanId",
                principalTable: "SubscriptionPlans",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RazorpayOrders_SubscriptionPlans_PlanId",
                table: "RazorpayOrders");

            migrationBuilder.DropIndex(
                name: "IX_RazorpayOrders_PlanId",
                table: "RazorpayOrders");
        }
    }
}
