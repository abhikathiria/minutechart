using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace minutechart.Models
{
    public class Customer
    {
        [Key]
        public int CustomerID { get; set; }

        [Required]
        [StringLength(100)]
        public string CustomerName { get; set; } = null!;

        [StringLength(15)]
        public string? ContactNumber { get; set; }

        [StringLength(100)]
        public string? Email { get; set; }
    }
}
