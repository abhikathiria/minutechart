// using System;
// using System.ComponentModel.DataAnnotations;
// using System.ComponentModel.DataAnnotations.Schema;


// namespace minutechart.Models
// {
//     public class StockDetail
//     {
//         [Key]
//         public int StockID { get; set; }

//         [StringLength(50)]
//         public string? PackSerialNumber { get; set; }

//         [Required]
//         public int BatchID { get; set; }

//         [Required]
//         [StringLength(32)]
//         public string PackSKU { get; set; }

//         [DataType(DataType.Date)]
//         public DateTime? ManufacturingDate { get; set; }

//         [DataType(DataType.Date)]
//         public DateTime? ExpiryDate { get; set; }

//         [Required]
//         [StringLength(20)]
//         [RegularExpression("IN STOCK|SOLD|EXPIRED|DAMAGED", ErrorMessage = "Invalid Status")]
//         public string Status { get; set; } = "IN STOCK";

//         // Navigation properties
//         public virtual PackDetail PackDetail { get; set; }
//         public virtual ProductionBatch ProductionBatch { get; set; }
//     }
// }