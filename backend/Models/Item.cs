using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic;

namespace minutechart.Models
{
    public class Item
    {
        [Key]
        public int ItemID { get; set; }

        [Required]
        [StringLength(100)]
        public string ItemName { get; set; } = null!;

        [Required]
        [Column(TypeName = "decimal(10,2)")]
        public decimal ItemRate { get; set; }

        [ForeignKey("ItemGroup")]
        public int ItemGroupID { get; set; }
        public ItemGroup ItemGroup { get; set; } = null!;
    }
}
