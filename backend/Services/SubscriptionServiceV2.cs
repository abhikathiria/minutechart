using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using minutechart.Data;
using minutechart.Models;
using minutechart.Helpers;
using Microsoft.EntityFrameworkCore;

namespace minutechart.Services
{
    public class SubscriptionServiceV2
    {
        private readonly MinutechartDbContext _db;
        private readonly SubscriptionTimelineManager _timeline;
        private readonly UserManager<AppUser> _userManager;
        private readonly ActivityLogger _logger;
        private readonly PlanInvoiceService _invoiceService;

        public SubscriptionServiceV2(
            MinutechartDbContext db,
            SubscriptionTimelineManager timeline,
            UserManager<AppUser> userManager,
            ActivityLogger logger,
            PlanInvoiceService invoiceService)
        {
            _db = db;
            _timeline = timeline;
            _userManager = userManager;
            _logger = logger;
            _invoiceService = invoiceService;
        }

        // entry point for subscription application
        public async Task<PlanInvoice> ApplyPurchaseAsync(
            AppUser user,
            Pricing newPlan,
            string billingCycle,
            decimal amountPaid,
            decimal prorationUsed,
            string provider,
            string providerPaymentId)
        {
            if (user == null) throw new ArgumentNullException(nameof(user));

            var now = DateTimeHelper.GetIndianTime();
            billingCycle = (billingCycle ?? "monthly").ToLowerInvariant();

            // 1. Active trial
            if (user.IsTrialActive && user.TrialEndDate.HasValue && user.TrialEndDate.Value > now)
            {
                var trialTier = await GetTrialTierAsync();

                if (newPlan.TierOrder > trialTier)
                {
                    return await ApplyImmediateUpgradeAsync(
                        user, newPlan, billingCycle, amountPaid, prorationUsed, provider, providerPaymentId);
                }

                return await QueuePurchaseAsync(
                    user, newPlan, billingCycle, amountPaid, prorationUsed, provider, providerPaymentId);
            }

            // 2. Check if any active paid plan exists
            var active = await _timeline.GetActiveAsync(user.Id, now);
            bool hasActivePaid = active != null ||
                (user.SubscriptionEndDate.HasValue && user.SubscriptionEndDate.Value > now);

            // 3. If user has no active trial and no active paid → start immediately
            if (!hasActivePaid)
            {
                return await ApplyImmediateUpgradeAsync(
                    user, newPlan, billingCycle, amountPaid, prorationUsed, provider, providerPaymentId);
            }

            // 4. If upgrading to higher tier → immediate start
            if (active != null && newPlan.TierOrder > active.Plan.TierOrder)
            {
                return await ApplyImmediateUpgradeAsync(
                    user, newPlan, billingCycle, amountPaid, prorationUsed, provider, providerPaymentId);
            }

            // 5. Otherwise queue it
            return await QueuePurchaseAsync(
                user, newPlan, billingCycle, amountPaid, prorationUsed, provider, providerPaymentId);
        }


        private async Task<PlanInvoice> ApplyImmediateUpgradeAsync(
            AppUser user,
            Pricing newPlan,
            string billingCycle,
            decimal amountPaid,
            decimal prorationUsed,
            string provider,
            string providerPaymentId)
        {
            var now = DateTimeHelper.GetIndianTime();

            user.SubscriptionStartDate = now;
            user.SubscriptionEndDate = billingCycle.ToLower() == "monthly"
                ? now.AddMonths(1)
                : now.AddYears(1);

            await _userManager.UpdateAsync(user);

            var invoice = new PlanInvoice
            {
                AppUserId = user.Id,
                PlanId = newPlan.Id,
                Plan = newPlan,
                BillingCycle = billingCycle,
                Amount = amountPaid + prorationUsed,
                ProrationCredit = prorationUsed,
                NetAmount = amountPaid,
                PaymentDate = now,
                PlanStartDate = now,
                PlanEndDate = billingCycle.ToLower() == "monthly"
                    ? now.AddMonths(1)
                    : now.AddYears(1),
                Currency = "INR",
                Status = "Paid",
                InvoiceNumber = "TEMP",
                RazorpayOrderId = provider == "razorpay" ? providerPaymentId : null,
                RazorpayPaymentId = provider == "razorpay" ? providerPaymentId : null
            };

            _db.PlanInvoices.Add(invoice);
            await _db.SaveChangesAsync();

            invoice.InvoiceNumber = $"INV-{invoice.Id}";
            _db.PlanInvoices.Update(invoice);
            await _db.SaveChangesAsync();

            // push queued forward
            await _timeline.PushQueuedForwardAsync(user.Id, invoice.PlanEndDate.Value);

            // invoice handling
            if (_invoiceService != null)
            {
                var file = $"INVOICE_{invoice.Id}_{now:ddMMMyyyy_hhmmtt}.pdf";
                await _invoiceService.GenerateInvoiceAsync(invoice, file);
                await _invoiceService.SendInvoiceEmailAsync(invoice);
            }

            return invoice;
        }

        private async Task<PlanInvoice> QueuePurchaseAsync(
            AppUser user,
            Pricing newPlan,
            string billingCycle,
            decimal amountPaid,
            decimal prorationUsed,
            string provider,
            string providerPaymentId)
        {
            var now = DateTimeHelper.GetIndianTime();

            DateTime nextStart = await _timeline.CalculateNextStartAsync(user.Id);
            DateTime nextEnd = billingCycle.ToLower() == "monthly"
                ? nextStart.AddMonths(1)
                : nextStart.AddYears(1);

            var invoice = new PlanInvoice
            {
                AppUserId = user.Id,
                PlanId = newPlan.Id,
                Plan = newPlan,
                BillingCycle = billingCycle,
                Amount = amountPaid + prorationUsed,
                ProrationCredit = prorationUsed,
                NetAmount = amountPaid,
                PaymentDate = now,
                PlanStartDate = nextStart,
                PlanEndDate = nextEnd,
                Currency = "INR",
                Status = "Paid",
                InvoiceNumber = "TEMP",
                RazorpayOrderId = provider == "razorpay" ? providerPaymentId : null,
                RazorpayPaymentId = provider == "razorpay" ? providerPaymentId : null
            };

            _db.PlanInvoices.Add(invoice);
            await _db.SaveChangesAsync();

            invoice.InvoiceNumber = $"INV-{invoice.Id}";
            _db.PlanInvoices.Update(invoice);
            await _db.SaveChangesAsync();

            if (_invoiceService != null)
            {
                var file = $"INVOICE_{invoice.Id}_{now:ddMMMyyyy_hhmmtt}.pdf";
                await _invoiceService.GenerateInvoiceAsync(invoice, file);
                await _invoiceService.SendInvoiceEmailAsync(invoice);
            }

            return invoice;
        }

        // -------------------------------------
        // GET TRIAL TIER (Usually Starter)
        // -------------------------------------
        private async Task<int> GetTrialTierAsync()
        {
            var pro = await _db.Pricings.FirstOrDefaultAsync(p => p.Name.ToLower() == "pro");
            return pro?.TierOrder ?? 3;
        }

        public async Task<int> ActivateDueQueuedInvoicesAsync()
        {
            var now = DateTimeHelper.GetIndianTime();
            int activatedCount = 0;

            var nextInvoices = await _db.PlanInvoices
                .Include(i => i.Plan)
                .Where(i =>
                    i.Status == "Paid" &&
                    i.PlanStartDate.HasValue &&
                    i.PlanEndDate.HasValue &&
                    i.PlanEndDate.Value >= now)
                .GroupBy(i => i.AppUserId)
                .Select(g => g.OrderBy(i => i.PlanStartDate).First())
                .ToListAsync();

            foreach (var invoice in nextInvoices)
            {
                // Only process if invoice should start now
                if (invoice.PlanStartDate.Value > now)
                    continue;

                var user = await _userManager.FindByIdAsync(invoice.AppUserId);
                if (user == null) continue;

                // Check using actual invoice timeline, not the User table
                var activeInvoice = await _db.PlanInvoices
                    .Where(i =>
                        i.AppUserId == invoice.AppUserId &&
                        i.Status == "Paid" &&
                        i.PlanStartDate <= now &&
                        i.PlanEndDate > now)
                    .FirstOrDefaultAsync();

                // If another invoice is already active right now, skip activation
                if (activeInvoice != null && activeInvoice.Id != invoice.Id)
                    continue;


                // Activate invoice
                user.SubscriptionStartDate = invoice.PlanStartDate;
                user.SubscriptionEndDate = invoice.PlanEndDate;
                // user.TrialStartDate = null;
                // user.TrialEndDate = null;

                var res = await _userManager.UpdateAsync(user);
                if (!res.Succeeded)
                {
                    await _logger.LogAsync("activate-queued-failed", "Subscription",
                        $"User:{user.Id} Invoice:{invoice.Id} Update failed");
                    continue;
                }

                await _logger.LogAsync("activated-queued-invoice", "Subscription",
                    $"User:{user.Id} Invoice:{invoice.Id} START:{invoice.PlanStartDate} END:{invoice.PlanEndDate}");

                activatedCount++;
            }

            return activatedCount;
        }
    }
}
