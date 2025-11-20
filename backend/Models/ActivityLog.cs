using System;
using minutechart.Helpers;
namespace minutechart.Models
{
    public class ActivityLog
    {
        public int Id { get; set; }
        public string? ActorId { get; set; }
        public string? ActorName { get; set; }
        public string? ActorRole { get; set; }
        public string? Action { get; set; }
        public string? TargetEntity { get; set; }
        public string? TargetName { get; set; }
        public string? Description { get; set; }
        public DateTime Timestamp { get; set; } = DateTimeHelper.GetIndianTime();
        public string? IPAddress { get; set; }
        public string? BrowserInfo { get; set; }
    }
}
