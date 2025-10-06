using System;

namespace minutechart.Models
{
    public class Invoice
    {
        public int Id { get; set; }
        public string AppUserId { get; set; }
        public int PlanId { get; set; }
        public SubscriptionPlan Plan { get; set; }
        public string RazorpayOrderId { get; set; }
        public string RazorpayPaymentId { get; set; }
        public DateTime PaymentDate { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; }
        public string InvoiceNumber { get; set; }
        public string Status { get; set; } = "Paid";
        public DateTime? PlanStartDate { get; set; }
        public DateTime? PlanEndDate { get; set; }
        public string? PdfPath { get; set; }  
    }
}
