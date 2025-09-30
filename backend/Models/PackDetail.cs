// using System.ComponentModel.DataAnnotations;
// using System.ComponentModel.DataAnnotations.Schema;

// namespace minutechart.Models
// {
//     public class PackDetail
//     {
//         [Key]
//         [StringLength(32)]
//         [DatabaseGenerated(DatabaseGeneratedOption.None)]
//         public string? PackID { get; set; }

//         [Required]
//         [StringLength(21)]
//         public string ProductSKU { get; set; } = null!;

//         [ForeignKey(nameof(ProductSKU))]
//         public Product? Product { get; set; }

//         [Required]
//         public int PackSize { get; set; }

//         [Required]
//         [Column(TypeName = "decimal(10, 2)")]
//         public decimal PackPrice { get; set; }

//         [Column(TypeName = "decimal(5,2)")]
//         [Range(0, 100, ErrorMessage = "Discount percentage must be between 0 and 100.")]
//         public decimal DiscountPercentage { get; set; } = 0;

//         [Required]
//         public int ShelfLife { get; set; }

//         [StringLength(32)]
//         public string? PackSKU { get; set; }

//         [Required]
//         public int ReorderLevel { get; set; } = 0;

//         [Required]
//         public int ReorderQuantity { get; set; } = 0;

//         [StringLength(255)]
//         public string? PackImage { get; set; }

//         public virtual ICollection<Cart>? Carts { get; set; }
//         public virtual ICollection<OrderDetail>? OrderDetails { get; set; }
//         public virtual ICollection<DraftOrderDetail>? DraftOrderDetails { get; set; }
//         public virtual ICollection<Wishlist>? Wishlists { get; set; }
//         public virtual ICollection<ProductionBatch>? ProductionBatches { get; set; }
//         public virtual ICollection<StockDetail>? StockDetails { get; set; }
//         public virtual ICollection<Inventory>? Inventory { get; set; }
//         public virtual ICollection<ManufacturingRequest>? ManufacturingRequests { get; set; }

//     }
// }
