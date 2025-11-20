using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using minutechart.Data;
using minutechart.Models;
using minutechart.Helpers;

namespace minutechart.Services
{
    public class SubscriptionTimelineManager
    {
        private readonly MinutechartDbContext _db;

        public SubscriptionTimelineManager(MinutechartDbContext db)
        {
            _db = db;
        }

        // Return the currently active PlanInvoice (the invoice that covers "now")
        public async Task<PlanInvoice?> GetActiveAsync(string userId, DateTime now)
        {
            return await _db.PlanInvoices
                .Include(i => i.Plan)
                .Where(i =>
                    i.AppUserId == userId &&
                    i.Status == "Paid" &&
                    i.PlanStartDate.HasValue &&
                    i.PlanEndDate.HasValue &&
                    i.PlanStartDate.Value <= now &&
                    i.PlanEndDate.Value > now)
                .OrderByDescending(i => i.PlanEndDate)
                .FirstOrDefaultAsync();
        }

        // Return queued (future) PlanInvoices ordered by start date
        public async Task<List<PlanInvoice>> GetQueuedAsync(string userId, DateTime now)
        {
            return await _db.PlanInvoices
                .Include(i => i.Plan)
                .Where(i =>
                    i.AppUserId == userId &&
                    i.Status == "Paid" &&
                    i.PlanStartDate.HasValue &&
                    i.PlanStartDate.Value > now)
                .OrderBy(i => i.PlanStartDate)
                .ToListAsync();
        }

        // Compute proration credit using active invoice only.
        public decimal CalculateProrationCredit(PlanInvoice activeInvoice, DateTime now)
        {
            if (activeInvoice?.PlanEndDate == null || activeInvoice.PlanStartDate == null)
                return 0m;

            if (activeInvoice.PlanEndDate.Value <= now)
                return 0m;

            var end = activeInvoice.PlanEndDate.Value;

            var remaining = end - now;
            if (remaining.TotalDays <= 0)
                return 0m;

            decimal totalDays = (activeInvoice.BillingCycle ?? "monthly").ToLowerInvariant() == "annual"
                ? 365m
                : 30m;

            decimal remainingDays = (decimal)remaining.TotalDays;

            var oldPrice = (activeInvoice.BillingCycle ?? "monthly").ToLowerInvariant() == "annual"
                ? activeInvoice.Plan.AnnualPrice
                : activeInvoice.Plan.MonthlyPrice;

            var credit = (remainingDays / totalDays) * oldPrice;

            return Math.Round(credit, 2, MidpointRounding.AwayFromZero);
        }

        // Calculate next start date for any new queued plan
        public async Task<DateTime> CalculateNextStartAsync(string userId)
        {
            var now = DateTimeHelper.GetIndianTime();

            var active = await _db.PlanInvoices
                .Where(i =>
                    i.AppUserId == userId &&
                    i.Status == "Paid" &&
                    i.PlanEndDate.HasValue &&
                    i.PlanEndDate.Value > now)
                .OrderByDescending(i => i.PlanEndDate)
                .FirstOrDefaultAsync();

            var lastQueued = await _db.PlanInvoices
                .Where(i =>
                    i.AppUserId == userId &&
                    i.Status == "Paid" &&
                    i.PlanStartDate.HasValue &&
                    i.PlanStartDate.Value > now)
                .OrderByDescending(i => i.PlanEndDate)
                .FirstOrDefaultAsync();

            DateTime baseline = now;

            if (active?.PlanEndDate != null && active.PlanEndDate.Value > baseline)
                baseline = active.PlanEndDate.Value;

            if (lastQueued?.PlanEndDate != null && lastQueued.PlanEndDate.Value > baseline)
                baseline = lastQueued.PlanEndDate.Value;

            return baseline;
        }

        // Push queued plans forward after immediate upgrade
        public async Task PushQueuedForwardAsync(string userId, DateTime newActiveEnd)
        {
            var now = DateTimeHelper.GetIndianTime();
            var queued = await GetQueuedAsync(userId, now);

            DateTime cursor = newActiveEnd;

            foreach (var q in queued)
            {
                var durationDays = (q.BillingCycle ?? "monthly").ToLowerInvariant() == "annual" ? 365 : 30;

                q.PlanStartDate = cursor;
                q.PlanEndDate = cursor.AddDays(durationDays);

                cursor = q.PlanEndDate.Value;

                _db.PlanInvoices.Update(q);
            }

            await _db.SaveChangesAsync();
        }
    }
}
