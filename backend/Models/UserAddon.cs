using minutechart.Helpers;

namespace minutechart.Models
{
    public class UserAddon
    {
        public int Id { get; set; }
        public string AppUserId { get; set; } = null!;
        public AppUser AppUser { get; set; } = null!;
        public int PricingId { get; set; }
        public Pricing Pricing { get; set; } = null!;
        public int Dashboards { get; set; }
        public decimal Price { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsActive => EndDate > DateTimeHelper.GetIndianTime();
    }
}
