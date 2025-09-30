using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations.Schema;

namespace minutechart.Models
{
    public class UserDatabaseConfig
    {
        public int Id { get; set; }

        public string UserId { get; set; } = string.Empty;

        public string ServerName { get; set; } = string.Empty;
        public string DatabaseName { get; set; } = string.Empty;
        public string DbUsername { get; set; } = string.Empty;
        public string DbPassword { get; set; } = string.Empty;

        public AppUser? User { get; set; }
    }
}


