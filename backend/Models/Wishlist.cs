// using System;
// using System.ComponentModel.DataAnnotations;
// using System.ComponentModel.DataAnnotations.Schema;

// namespace minutechart.Models
// {
//     public class Wishlist
//     {
//         [Key]
//         public int WishlistID { get; set; }

//         [Required]
//         public int CustomerID { get; set; }

//         [Required]
//         [StringLength(32)]
//         public string PackSKU { get; set; }

//         public DateTime AddedDate { get; set; } = DateTime.Now;

//         public virtual Customer Customer { get; set; }
//         public virtual PackDetail PackDetail { get; set; }
//     }
// }
