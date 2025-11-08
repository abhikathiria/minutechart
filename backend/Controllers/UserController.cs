using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using minutechart.Models;
using minutechart.Data;
using minutechart.Helpers;
using minutechart.Services;
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
        private readonly ActivityLogger _activityLogger;



        public UserController(UserManager<AppUser> userManager, MinutechartDbContext mainDb, ActivityLogger activityLogger)
        {
            _userManager = userManager;
            _mainDb = mainDb;
            _activityLogger = activityLogger;
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
        // Inside User Controller

        public class SuggestModuleDto
        {
            public string Text { get; set; } = string.Empty;
        }

        [HttpPost("suggest-module")]
        public async Task<IActionResult> SuggestModule([FromBody] SuggestModuleDto model)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var suggestion = new ModuleSuggestion
            {
                AppUserId = userId,
                SuggestionText = model.Text
            };
            _mainDb.ModuleSuggestions.Add(suggestion);
            await _mainDb.SaveChangesAsync();
            return Ok();
        }

        // ----------------------------------------------------
        // DTO and GetSuggestionHistory (Updated with AdminResponse)
        // ----------------------------------------------------

        public class UserModuleSuggestionDto
        {
            public int Id { get; set; }
            public string SuggestionText { get; set; } = string.Empty;
            public string Status { get; set; } = "Pending";

            // --- ADDED ADMIN RESPONSE ---
            public string AdminResponse { get; set; } = string.Empty;
            // ----------------------------

            public DateTime CreatedAt { get; set; }
        }

        [HttpGet("module-suggestions-history")]
        public async Task<IActionResult> GetSuggestionHistory()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User identity not found.");
            }

            var history = await _mainDb.ModuleSuggestions
                .Where(s => s.AppUserId == userId)
                .OrderByDescending(s => s.CreatedAt)
                .Select(s => new UserModuleSuggestionDto
                {
                    Id = s.Id,
                    SuggestionText = s.SuggestionText,
                    Status = s.Status,
                    CreatedAt = s.CreatedAt,
                    // Map the new field
                    AdminResponse = s.AdminResponse
                })
                .ToListAsync();

            return Ok(history);
        }

    }
}
