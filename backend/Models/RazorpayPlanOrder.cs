namespace minutechart.Models
{
    public class RazorpayPlanOrder
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

        public Pricing Plan { get; set; } = null!;

        public string BillingCycle { get; set; } = "monthly";
        public string Intent { get; set; } = "purchase";
        public decimal ProrationCredit { get; set; } = 0M;
    }

}