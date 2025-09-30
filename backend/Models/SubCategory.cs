// using System.ComponentModel.DataAnnotations;
// using System.ComponentModel.DataAnnotations.Schema;
// using System.Collections.Generic;

// namespace minutechart.Models
// {
//     public class SubCategory
//     {
//         [Key]
//         [StringLength(10)]
//         [DatabaseGenerated(DatabaseGeneratedOption.None)]
//         public string? SubCategoryID { get; set; }

//         [Required]
//         [StringLength(100)]
//         public string SubCategoryName { get; set; } = null!;

//         public string? SubCategoryDescription { get; set; }

//         public int NumberOfProducts { get; set; } = 0;

//         [ForeignKey("Category")]
//         public string CategoryID { get; set; } = null!;

//         public Category? Category { get; set; }

//         public ICollection<Product>? Products { get; set; }
//     }
// }
