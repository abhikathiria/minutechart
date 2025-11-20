namespace minutechart.Models
{
    public class PlannedSubscriptionChange
    {
        public int Id { get; set; }
        public string AppUserId { get; set; }
        public int NewPlanId { get; set; }
        public string BillingCycle { get; set; } = "monthly";
        public DateTime EffectiveDate { get; set; }
        public string ActionType { get; set; } = "queued"; // queued | downgrade
    }

}