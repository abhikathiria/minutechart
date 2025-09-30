using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace minutechart.Models
{
    public class Broker
    {
        [Key]
        public int BrokerID { get; set; }

        [Required]
        [StringLength(100)]
        public string BrokerName { get; set; } = null!;

        [StringLength(15)]
        public string? BrokerContactNumber { get; set; }

    }
}