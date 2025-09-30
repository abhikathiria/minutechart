using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace minutechart.Models
{
    public class Supplier
    {
        [Key]
        public int SupplierID { get; set; }

        [Required]
        [StringLength(100)]
        public string SupplierName { get; set; } = null!;

        [StringLength(15)]
        public string? ContactNumber { get; set; }

        [StringLength(100)]
        public string? Email { get; set; }
    }
}
