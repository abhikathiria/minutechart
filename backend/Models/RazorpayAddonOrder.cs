using System;
using minutechart.Helpers;

namespace minutechart.Models
{
    public class RazorpayAddonOrder
    {
        public int Id { get; set; }

        public string OrderId { get; set; } = string.Empty;
        public string? PaymentId { get; set; }
        public string Status { get; set; } = "created";

        public string AppUserId { get; set; } = null!;
        public AppUser AppUser { get; set; } = null!;

        public int PricingId { get; set; }
        public Pricing Pricing { get; set; } = null!;

        public decimal Amount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? PaidAt { get; set; }
    }
}
