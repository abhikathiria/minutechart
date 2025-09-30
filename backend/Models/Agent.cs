using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace minutechart.Models
{
    public class Agent
    {
        [Key]
        public int AgentID { get; set; }

        [Required]
        [StringLength(100)]
        public string AgentName { get; set; } = null!;

        [StringLength(15)]
        public string? AgentContactNumber { get; set; }
    }
}