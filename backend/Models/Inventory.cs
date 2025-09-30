// using System;
// using System.ComponentModel.DataAnnotations;
// using System.ComponentModel.DataAnnotations.Schema;

// namespace minutechart.Models
// {
//     public class Inventory
//     {
//         [Key]
//         public int InventoryID { get; set; }

//         [Required]
//         [StringLength(32)]
//         public string PackSKU { get; set; }

//         [Required]
//         [Range(0, int.MaxValue)]
//         public int StockQuantity { get; set; }

//         [Column(TypeName = "date")]
//         public DateTime LastRestocked { get; set; } = DateTime.Now;

//         [Required]
//         public bool IsDiscontinued { get; set; } = false;

//         // Navigation properties
//         public virtual PackDetail PackDetails { get; set; }
//     }
// }