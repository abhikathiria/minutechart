using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using minutechart.Helpers;

namespace minutechart.Models
{
    public class ResellerPaymentDetail
    {
        public int Id { get; set; }
        public string AppUserId { get; set; }
        public virtual AppUser User { get; set; }

        // Bank details (optional)
        public string? AccountHolderName { get; set; }
        public string? BankAccountNumber { get; set; }
        public string? IFSC { get; set; }

        // UPI details (optional)
        public string? UpiId { get; set; }

        // RazorpayX IDs created by backend
        public string? RazorpayContactId { get; set; }
        public string? RazorpayFundAccountId { get; set; }

        public DateTime UpdatedAt { get; set; } = DateTimeHelper.GetIndianTime();
    }
}
