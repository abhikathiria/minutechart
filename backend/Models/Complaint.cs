using System;
using System.ComponentModel.DataAnnotations;
using minutechart.Helpers;
using System.Collections.Generic;

namespace minutechart.Models
{
    public class Complaint
    {
        public int Id { get; set; }
        [Required]
        public string? Title { get; set; }
        [Required]
        public string? Description { get; set; }
        public string? Category { get; set; }  // e.g., "Technical", "Billing"
        public string Status { get; set; } = "Open";  // Open, In Progress, Resolved, Closed
        public string? AdminResponse { get; set; }  // Admin's reply
        public DateTime CreatedAt { get; set; } = DateTimeHelper.GetIndianTime();
        public DateTime? UpdatedAt { get; set; }
        public string AppUserId { get; set; }  // Link to user
        public virtual AppUser AppUser { get; set; }
        public string? UserAttachmentUrls { get; set; }  // e.g., "/uploads/file1.jpg,/uploads/file2.png"
        public string? AdminAttachmentUrls { get; set; }
    }
}