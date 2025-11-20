using System;
using minutechart.Helpers;

namespace minutechart.Models
{
    public class AddonInvoice
    {
        public int Id { get; set; }

        // User
        public string AppUserId { get; set; } = null!;
        public AppUser AppUser { get; set; } = null!;

        // Pricing package
        public int PricingId { get; set; }
        public Pricing Pricing { get; set; } = null!;

        // Payment details
        public string RazorpayOrderId { get; set; } = string.Empty;
        public string? RazorpayPaymentId { get; set; }
        public string Status { get; set; } = "Pending"; // Pending / Paid / Failed
        public decimal Amount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? PaymentDate { get; set; }

        // Addon invoice details
        public string InvoiceNumber { get; set; } = string.Empty;
        public int Dashboards { get; set; }

        // Validity of add-on
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }

        public bool IsActive =>
            PaymentDate != null &&
            EndDate > DateTimeHelper.GetIndianTime() &&
            Status == "Paid";
        public string? PdfPath { get; set; }
    }
}
