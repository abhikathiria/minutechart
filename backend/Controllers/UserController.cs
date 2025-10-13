using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using minutechart.Models;
using minutechart.Data;
using minutechart.Helpers;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace minutechart.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly UserManager<AppUser> _userManager;
        private readonly MinutechartDbContext _mainDb;


        public UserController(UserManager<AppUser> userManager, MinutechartDbContext mainDb)
        {
            _userManager = userManager;
            _mainDb = mainDb;
        }

        [HttpGet("subscription-status")]
        public async Task<IActionResult> GetSubscriptionStatus()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound();

            var now = DateTimeHelper.GetIndianTime();

            // Fetch paid invoices (invoice holds PlanStartDate and PlanEndDate)
            var invoices = await _mainDb.Invoices
                .Include(i => i.Plan)
                .Where(i => i.AppUserId == user.Id && i.Status == "Paid")
                .OrderBy(i => i.PlanStartDate ?? i.PaymentDate)
                .ToListAsync();

            // Map invoices to activePlans using PlanStartDate/PlanEndDate when available
            var activePlans = invoices.Select(i =>
            {
                var start = i.PlanStartDate ?? i.PaymentDate;
                var end = i.PlanEndDate ?? (i.PaymentDate.AddDays(i.Plan.DurationDays));

                int remainingDays = 0;
                if (end > now)
                {
                    var effectiveStart = start > now ? start : now;
                    remainingDays = (int)Math.Ceiling((end - effectiveStart).TotalDays);
                    if (remainingDays < 0) remainingDays = 0;
                }

                return new
                {
                    name = i.Plan?.Name ?? "Unknown",
                    subscriptionStart = start,
                    subscriptionEnd = end,
                    totalDays = i.Plan?.DurationDays ?? (int)(end - start).TotalDays,
                    remainingDays
                };
            }).ToList();

            int totalDaysRemaining = activePlans.Sum(p => p.remainingDays);

            var response = new
            {
                isTrialActive = user.IsTrialActive,
                isPaidSubscriptionActive = user.IsPaidSubscriptionActive,
                hasActivePlan = user.HasActivePlan,
                trialStart = user.TrialStartDate,
                trialEnd = user.TrialEndDate,
                subscriptionStart = user.SubscriptionStartDate,
                subscriptionEnd = user.SubscriptionEndDate,
                activePlans,
                totalDaysRemaining
            };

            return Ok(response);
        }

        [HttpGet("orders")]
        public async Task<IActionResult> GetUserOrders()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var invoices = await _mainDb.Invoices
                .Include(i => i.Plan)
                .Where(i => i.AppUserId == userId)
                .OrderByDescending(i => i.PaymentDate)
                .Select(i => new
                {
                    i.Id,
                    i.InvoiceNumber,
                    i.RazorpayOrderId,
                    i.PaymentDate,
                    i.Amount,
                    i.Currency,
                    PlanName = i.Plan.Name,
                    PlanDuration = i.Plan.DurationDays,
                    PlanStartDate = i.PlanStartDate ?? i.PaymentDate,
                    PlanEndDate = i.PlanEndDate ?? i.PaymentDate.AddDays(i.Plan.DurationDays)
                })
                .ToListAsync();

            return Ok(invoices);
        }
    }
}
