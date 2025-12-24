namespace minutechart.Models
{
    public class AdminProfile
    {
        public int Id { get; set; }
        public string? AdminCode { get; set; }
        public string? AdminName { get; set; }
        public string? ProfilePhotoUrl { get; set; }
        public string? CompanyLogoUrl { get; set; }
        public string? GST { get; set; }
        public string? CompanyName { get; set; }
        public decimal? CommissionPercentage { get; set; }
        public string AppUserId { get; set; }
        public virtual AppUser AppUser { get; set; }

    }
}
