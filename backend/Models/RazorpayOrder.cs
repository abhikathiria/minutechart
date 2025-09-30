namespace minutechart.Models
{
    public class RazorpayOrder
    {
        public int Id { get; set; }
        public string OrderId { get; set; } = null!;
        public string? PaymentId { get; set; }
        public string AppUserId { get; set; } = null!;
        public int PlanId { get; set; }
        public decimal Amount { get; set; }
        public string Status { get; set; } = "created";
        public DateTime CreatedAt { get; set; }
        public DateTime? PaidAt { get; set; }

        // Add this navigation property
        public SubscriptionPlan Plan { get; set; } = null!;
    }

}