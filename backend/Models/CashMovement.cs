using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace minutechart.Models
{
    public class CashMovement
    {
        [Key]
        public int MovementID { get; set; }
        [Required]
        public DateTime MovementDate { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal CashOpening { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal CashClosing { get; set; }
    }
}