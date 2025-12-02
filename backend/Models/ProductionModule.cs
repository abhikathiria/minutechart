using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace minutechart.Models
{
    public class ProductionModule
    {
        public int Id { get; set; }
        public string AppUserId { get; set; }
        public virtual AppUser AppUser { get; set; }
        public string ComponentId { get; set; }

        public string? ModuleTitle { get; set; }
        public string SqlQuery { get; set; }
        public DateTime LastUpdated { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? UserIpAddress { get; set; }
        public bool HideQuery { get; set; }
        public DateTime? LastRefreshedAt { get; set; }
        public string? CachedJsonData { get; set; }
    }
}
