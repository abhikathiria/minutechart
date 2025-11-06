using System;
using minutechart.Helpers;
namespace minutechart.Models
{
    public class ActivityLog
    {
        public int Id { get; set; }
        public string ActorId { get; set; }      // who did the action
        public string ActorName { get; set; }    // e.g. "Admin A"
        public string ActorRole { get; set; }    // e.g. "Admin" or "User"

        public string Action { get; set; }       // e.g. "updated complaint", "added module"
        public string TargetEntity { get; set; } // e.g. "Complaint", "Module", "User"
        public string TargetName { get; set; }   // e.g. "Complaint #2" or "Module: Reports"
        public string Description { get; set; }  // full sentence: "Admin B updated Complaint #2"
        
        public DateTime Timestamp { get; set; } = DateTimeHelper.GetIndianTime();
        public string IPAddress { get; set; }
        public string BrowserInfo { get; set; }
    }
}
