using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace minutechart.Models
{
    public class Transaction
    {
        [Key]
        public int TransactionID { get; set; }

        [Required]
        public DateTime TransactionDate { get; set; }

        [Required]
        [StringLength(50)]
        public string Type { get; set; } = null!; // Sale, Purchase, Payment, Cheque

        [ForeignKey("Customer")]
        public int? CustomerID { get; set; }
        public Customer? Customer { get; set; }

        [ForeignKey("Supplier")]
        public int? SupplierID { get; set; }
        public Supplier? Supplier { get; set; }

        [ForeignKey("Agent")]
        public int? AgentID { get; set; }
        public Agent? Agent { get; set; }

        [ForeignKey("Broker")]
        public int? BrokerID { get; set; }
        public Broker? Broker { get; set; }

        [StringLength(50)]
        public string? PaymentMode { get; set; } // Cash, Bank, Cheque

        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Brokerage { get; set; } = 0;

        [StringLength(50)]
        public string? Status { get; set; } // Pending, Completed, Returned

        public bool IsOutstanding { get; set; } = false;

        public DateTime? DueDate { get; set; }
    }
}