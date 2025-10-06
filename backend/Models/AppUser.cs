using Microsoft.AspNetCore.Identity;
using minutechart.Helpers;

namespace minutechart.Models
{
    public class AppUser : IdentityUser
    {
        public string? CompanyName { get; set; } = null!;
        public string? CustomerName { get; set; } = null!;
        public string? AdminName { get; set; }
        public string AccountStatus { get; set; } = "Pending";
        public DateTime? EmailConfirmationTokenGeneratedAt { get; set; }
        public virtual UserProfile UserProfile { get; set; }
        public DateTime? TrialStartDate { get; set; }
        public DateTime? TrialEndDate { get; set; }
        public DateTime? SubscriptionStartDate { get; set; }
        public DateTime? SubscriptionEndDate { get; set; }
        public bool IsTrialActive =>
            TrialStartDate.HasValue &&
            TrialEndDate.HasValue &&
            TrialStartDate.Value <= DateTimeHelper.GetIndianTime() &&
            TrialEndDate.Value >= DateTimeHelper.GetIndianTime();
        public bool IsPaidSubscriptionActive =>
            SubscriptionStartDate.HasValue &&
            SubscriptionEndDate.HasValue &&
            SubscriptionStartDate.Value <= DateTimeHelper.GetIndianTime() &&
            SubscriptionEndDate.Value >= DateTimeHelper.GetIndianTime();
        public bool HasActivePlan => IsTrialActive || IsPaidSubscriptionActive;
    }
}
