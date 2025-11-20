using System;
using System.Collections.Generic;
using minutechart.Helpers;
using System.ComponentModel.DataAnnotations;

namespace minutechart.Models
{
    public class CommissionBill
    {
        public int Id { get; set; }
        public string AppUserId { get; set; }
        public string? AdminName { get; set; }
        public virtual AppUser Admin { get; set; }
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public decimal TotalCommission { get; set; }
        public string Status { get; set; } = "Pending";
        public DateTime CreatedAt { get; set; } = DateTimeHelper.GetIndianTime();
        public DateTime? ApprovedAt { get; set; }
        public string? PayoutId { get; set; }    // Razorpay payout id when created
        public string? PayoutStatus { get; set; } // e.g., created/processed/failed
        public string? PayoutMode { get; set; } // IMPS/NEFT/UPI
        public DateTime? PaidAt { get; set; }
        public virtual List<CommissionBillItem> Items { get; set; } = new();
    }
}
