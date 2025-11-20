namespace minutechart.Models
{
    public class Pricing
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public decimal MonthlyPrice { get; set; }
        public decimal AnnualPrice { get; set; }
        public int TierOrder { get; set; } = 0; // Starter=1, Growth=2, Pro=3, Premium=4
        public int DashboardLimit { get; set; }
        public int RefreshRateMinutes { get; set; }
        public bool ExcelExport { get; set; }
        public bool PrioritySupport { get; set; }
        public bool DashboardAddonEnabled { get; set; }
        public int AddonPrice { get; set; }
        public int AddonDashboards { get; set; }
    }
}