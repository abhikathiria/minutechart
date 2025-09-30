using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;


namespace minutechart.Models
{
    public class TransactionDetail
    {
        [Key]
        public int DetailID { get; set; }

        [ForeignKey("Transaction")]
        public int TransactionID { get; set; }
        public Transaction Transaction { get; set; } = null!;

        [ForeignKey("Item")]
        public int ItemID { get; set; }
        public Item Item { get; set; } = null!;

        [Column(TypeName = "decimal(18,2)")]
        public decimal Quantity { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Rate { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }
    }
}