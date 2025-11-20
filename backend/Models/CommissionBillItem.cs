using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace minutechart.Models
{
    public class CommissionBillItem
    {
        public int Id { get; set; }
        public int CommissionBillId { get; set; }
        public virtual CommissionBill CommissionBill { get; set; }
        public string? AppUserId { get; set; }
        public virtual AppUser User { get; set; }
        public string? CompanyName { get; set; }
        public string? CustomerName { get; set; }
        public int PurchaseId { get; set; } // RazorpayOrder.Id
        public string? PlanName { get; set; }
        public decimal Amount { get; set; }
        public decimal CommissionPercentage { get; set; }
        public decimal CommissionAmount { get; set; }
        public DateTime PurchasedOn { get; set; }
    }
}
