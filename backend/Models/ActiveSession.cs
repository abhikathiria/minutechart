using System;
using System.ComponentModel.DataAnnotations;
using minutechart.Helpers;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNetCore.Identity;

namespace minutechart.Models
{
    public class ActiveSession
    {
        public int Id { get; set; }
        public string AppUserId { get; set; }
        public virtual AppUser AppUser { get; set; }
        [Required]
        public DateTime LastActivity { get; set; }

    }
}
