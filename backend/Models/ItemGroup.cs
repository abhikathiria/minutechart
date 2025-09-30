using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic;

namespace minutechart.Models
{
    public class ItemGroup
    {
        [Key]
        public int ItemGroupID { get; set; }

        [Required]
        [StringLength(100)]
        public string ItemGroupName { get; set; } = null!;
    }
}
