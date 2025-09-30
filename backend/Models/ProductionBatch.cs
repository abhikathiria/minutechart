// using System;
// using System.ComponentModel.DataAnnotations;
// using System.ComponentModel.DataAnnotations.Schema;

// namespace minutechart.Models
// {
//     public class ProductionBatch
//     {
//         [Key]
//         public int BatchID { get; set; }

//         [Required]
//         [StringLength(32)]
//         public string PackSKU { get; set; }

//         [Required]
//         [DataType(DataType.Date)]
//         public DateTime ManufacturingDate { get; set; }

//         [DataType(DataType.Date)]
//         public DateTime? ExpiryDate { get; set; }

//         [Required]
//         [Range(1, int.MaxValue, ErrorMessage = "Quantity must be greater than 0")]
//         public int QuantityManufactured { get; set; }

//         public DateTime CreatedAt { get; set; } = DateTime.Now;

//         // Navigation property
//         public virtual PackDetail PackDetail { get; set; }
//         public virtual ICollection<StockDetail> StockDetails { get; set; }

//     }
// }