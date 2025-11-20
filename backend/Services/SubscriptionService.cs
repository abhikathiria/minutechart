using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using minutechart.Data;
using minutechart.Models;
using minutechart.Helpers;
using System.Linq;

namespace minutechart.Services
{
    public class SubscriptionService
    {
        private readonly MinutechartDbContext _db;
        private readonly UserManager<AppUser> _userManager;
        private readonly ActivityLogger _logger;

        public SubscriptionService(
            MinutechartDbContext db,
            UserManager<AppUser> userManager,
            ActivityLogger logger)
        {
            _db = db;
            _userManager = userManager;
            _logger = logger;
        }

        // ------------------------------
        // PRORATION CALCULATION
        // ------------------------------
        public decimal CalculateProrationCredit(AppUser user, Pricing oldPlan, string oldBillingCycle, DateTime now)
        {
            now = DateTimeHelper.GetIndianTime();

            if (user == null || oldPlan == null) return 0m;
            if (!user.SubscriptionEndDate.HasValue) return 0m;
            if (user.SubscriptionEndDate.Value <= now) return 0m;

            decimal totalDays = oldBillingCycle == "annual" ? 365m : 30m;
            decimal daysRemaining = (decimal)(user.SubscriptionEndDate.Value - now).TotalDays;

            if (daysRemaining <= 0) return 0m;

            var oldPrice = oldBillingCycle == "annual"
                ? oldPlan.AnnualPrice
                : oldPlan.MonthlyPrice;

            var credit = (daysRemaining / totalDays) * oldPrice;

            return Math.Round(credit, 2, MidpointRounding.AwayFromZero);
        }


        // ------------------------------
        // IMMEDIATE UPGRADE (INVOICE CREATION)
        // ------------------------------
        public async Task<PlanInvoice> ApplyImmediateUpgradeAsync(
            AppUser user,
            Pricing newPlan,
            string newBillingCycle,
            decimal grossAmount,
            decimal prorationCredit,
            DateTime now,
            string paymentProvider,
            string paymentId)
        {
            if (user == null)
                throw new ArgumentNullException(nameof(user));

            now = DateTimeHelper.GetIndianTime();

            int durationDays = (newBillingCycle ?? "monthly").ToLowerInvariant() == "annual"
                ? 365
                : 30;

            // End trial
            user.TrialStartDate = null;
            user.TrialEndDate = null;

            // Set subscription window
            user.SubscriptionStartDate = now;
            user.SubscriptionEndDate = now.AddDays(durationDays);

            await _userManager.UpdateAsync(user);

            // IMPORTANT — Fix NULL invoice number issue
            var invoice = new PlanInvoice
            {
                AppUserId = user.Id,
                PlanId = newPlan.Id,
                Plan = newPlan,
                BillingCycle = newBillingCycle,
                Amount = grossAmount,
                ProrationCredit = prorationCredit,
                NetAmount = Math.Max(0m, grossAmount - prorationCredit),
                PaymentDate = now,
                PlanStartDate = user.SubscriptionStartDate,
                PlanEndDate = user.SubscriptionEndDate,
                Currency = "INR",
                RazorpayOrderId = paymentProvider == "razorpay" ? paymentId : null,
                RazorpayPaymentId = paymentProvider == "razorpay" ? paymentId : null,
                Status = "Paid",

                // FIX: prevent DB null error
                InvoiceNumber = "TEMP"
            };

            _db.PlanInvoices.Add(invoice);
            await _db.SaveChangesAsync();

            // Now assign the final invoice number
            invoice.InvoiceNumber = $"INV-{invoice.Id}";
            _db.PlanInvoices.Update(invoice);
            await _db.SaveChangesAsync();

            await _logger.LogAsync(
                "immediate-upgrade",
                "Subscription",
                $"User:{user.Id} NewPlan:{newPlan.Name} Net:{invoice.NetAmount} Credit:{invoice.ProrationCredit}");

            return invoice;
        }


        // ------------------------------
        // SCHEDULE FUTURE PLAN CHANGE
        // (used for queued purchases or downgrades)
        // ------------------------------
        public async Task SchedulePlanChangeAsync(
            AppUser user,
            int newPlanId,
            string billingCycle,
            DateTime effectiveDate)
        {
            if (user == null)
                throw new ArgumentNullException(nameof(user));

            effectiveDate = DateTimeHelper.GetIndianTime();

            var rec = new PlannedSubscriptionChange
            {
                AppUserId = user.Id,
                NewPlanId = newPlanId,
                BillingCycle = billingCycle ?? "monthly",
                EffectiveDate = effectiveDate,
                ActionType = "queued"
            };

            _db.PlannedSubscriptionChanges.Add(rec);
            await _db.SaveChangesAsync();

            await _logger.LogAsync(
                "scheduled-plan-change",
                "Subscription",
                $"User:{user.Id} FuturePlan:{newPlanId} Effective:{effectiveDate}");
        }


        // ------------------------------
        // APPLY SCHEDULED CHANGE (worker/admin)
        // ------------------------------
        public async Task ApplyScheduledChangeAsync(PlannedSubscriptionChange rec)
        {
            if (rec == null) return;

            var user = await _userManager.FindByIdAsync(rec.AppUserId);
            var plan = await _db.Pricings.FindAsync(rec.NewPlanId);

            if (user == null || plan == null) return;

            var now = DateTimeHelper.GetIndianTime();

            int durationDays = (rec.BillingCycle ?? "monthly").ToLowerInvariant() == "annual"
                ? 365
                : 30;

            user.SubscriptionStartDate = now;
            user.SubscriptionEndDate = now.AddDays(durationDays);

            user.TrialStartDate = null;
            user.TrialEndDate = null;

            await _userManager.UpdateAsync(user);

            var invoice = new PlanInvoice
            {
                AppUserId = user.Id,
                PlanId = plan.Id,
                Plan = plan,
                BillingCycle = rec.BillingCycle,
                Amount = rec.BillingCycle == "annual" ? plan.AnnualPrice : plan.MonthlyPrice,
                ProrationCredit = 0m,
                NetAmount = rec.BillingCycle == "annual" ? plan.AnnualPrice : plan.MonthlyPrice,
                PaymentDate = now,
                PlanStartDate = user.SubscriptionStartDate,
                PlanEndDate = user.SubscriptionEndDate,
                Currency = "INR",
                Status = "Paid",

                InvoiceNumber = "TEMP"
            };

            _db.PlanInvoices.Add(invoice);
            _db.PlannedSubscriptionChanges.Remove(rec);
            await _db.SaveChangesAsync();

            invoice.InvoiceNumber = $"INV-{invoice.Id}";
            _db.PlanInvoices.Update(invoice);
            await _db.SaveChangesAsync();

            await _logger.LogAsync(
                "applied-scheduled-change",
                "Subscription",
                $"User:{user.Id} NowOn:{plan.Name}");
        }
    }
}
