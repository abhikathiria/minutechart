namespace minutechart.Models
{
    public class SubscriptionPlan
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public long Price { get; set; }
        public int DurationDays { get; set; }
        public string Features { get; set; }
        public string Highlight { get; set; }
    }
}
