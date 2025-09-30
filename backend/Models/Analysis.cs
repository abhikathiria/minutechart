using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace minutechart.Models
{
    public class Analysis
    {
        public DateTime? TransactionDate { get; set; }
        public DateTime? CashMovementDate { get; set; }

        // Customer
        public int? CustomerID { get; set; }
        public string? CustomerName { get; set; }
        public decimal? TotalSales { get; set; }
        public decimal? CustomerOutstanding { get; set; }

        // Supplier
        public int? SupplierID { get; set; }
        public string? SupplierName { get; set; }
        public decimal? TotalPurchases { get; set; }

        // Item
        public int? ItemID { get; set; }
        public string? ItemName { get; set; }
        public string? ItemGroupName { get; set; }
        public decimal? TotalQuantitySold { get; set; }
        public decimal? TotalItemSales { get; set; }
        public decimal? MaxRate { get; set; }
        public decimal? MinRate { get; set; }

        // Broker
        public int? BrokerID { get; set; }
        public string? BrokerName { get; set; }
        public decimal? TotalBrokerage { get; set; }

        // Agent
        public int? AgentID { get; set; }
        public string? AgentName { get; set; }
        public decimal? AgentOutstanding { get; set; }

        // Cheque
        public int? ChequeReturns { get; set; }

        // Cash Flow
        public decimal? CashIn { get; set; }
        public decimal? CashOut { get; set; }

        // Fund Flow
        public decimal? FundIn { get; set; }
        public decimal? FundOut { get; set; }

        // Cash Movements
        public decimal? CashOpening { get; set; }
        public decimal? CashClosing { get; set; }
    }
}
