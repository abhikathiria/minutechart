using System;
using minutechart.Helpers;
namespace minutechart.Models
{
    public class ModuleSuggestion
    {
        public int Id { get; set; }
        public string AppUserId { get; set; }
        public AppUser AppUser { get; set; }
        public string SuggestionText { get; set; }
        public string Status { get; set; } = "Pending";
        public string AdminResponse { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTimeHelper.GetIndianTime();
    }

}
