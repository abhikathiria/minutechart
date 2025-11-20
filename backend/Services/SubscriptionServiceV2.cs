using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using minutechart.Data;
using minutechart.Models;
using minutechart.Helpers;

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

            var active = await _timeline.GetActiveAsync(user.Id, now);

            // immediate upgrade
            if (active != null && newPlan.TierOrder > active.Plan.TierOrder)
            {
                return await ApplyImmediateUpgradeAsync(
                    user,
                    newPlan,
                    billingCycle,
                    amountPaid,
                    prorationUsed,
                    provider,
                    providerPaymentId
                );
            }

            // queued
            return await QueuePurchaseAsync(
                user,
                newPlan,
                billingCycle,
                amountPaid,
                prorationUsed,
                provider,
                providerPaymentId
            );
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

            int duration = billingCycle.ToLower() == "annual" ? 365 : 30;

            // end trial
            user.TrialStartDate = null;
            user.TrialEndDate = null;

            user.SubscriptionStartDate = now;
            user.SubscriptionEndDate = now.AddDays(duration);
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
                PlanEndDate = now.AddDays(duration),
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
            int durationDays = billingCycle.ToLower() == "annual" ? 365 : 30;

            DateTime nextStart = await _timeline.CalculateNextStartAsync(user.Id);
            DateTime nextEnd = nextStart.AddDays(durationDays);

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
    }
}
