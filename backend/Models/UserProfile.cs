namespace minutechart.Models
{
    public class UserProfile
    {
        public int Id { get; set; }

        public string CompanyName { get; set; }
        public string ServerName { get; set; }
        public string DatabaseName { get; set; }
        public string DbUsername { get; set; }
        public string DbPassword { get; set; }
        public int RefreshTime { get; set; } // in milliseconds

        public string AppUserId { get; set; }
        public virtual AppUser AppUser { get; set; }

    }
}
