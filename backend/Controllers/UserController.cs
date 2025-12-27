using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Security.Claims;
using System.Net.Http.Headers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

using minutechart.Models;
using minutechart.Data;
using minutechart.Services;
using minutechart.Helpers;

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
        private readonly IConfiguration _config;
        private readonly IHttpClientFactory _httpFactory;
        private readonly AddonInvoiceService _addonInvoiceService;



        public UserController(UserManager<AppUser> userManager, MinutechartDbContext mainDb, IConfiguration config,
            IHttpClientFactory httpFactory, ActivityLogger activityLogger, AddonInvoiceService addonInvoiceService)
        {
            _userManager = userManager;
            _mainDb = mainDb;
            _config = config;
            _httpFactory = httpFactory;
            _activityLogger = activityLogger;
            _addonInvoiceService = addonInvoiceService;
        }

        [HttpGet("subscription-status")]
        public async Task<IActionResult> GetSubscriptionStatus()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound();

            var now = DateTimeHelper.GetIndianTime();

            // Load invoices
            var paidInvoices = await _mainDb.PlanInvoices
                .Include(i => i.Plan)
                .Where(i => i.AppUserId == user.Id && i.Status == "Paid")
                .OrderByDescending(i => i.PaymentDate)
                .ToListAsync();

            DateTime InvoiceStart(PlanInvoice inv) => inv.PlanStartDate ?? inv.PaymentDate;
            DateTime InvoiceEnd(PlanInvoice inv)
            {
                if (inv.PlanEndDate.HasValue) return inv.PlanEndDate.Value;
                var cycle = (inv.BillingCycle ?? "null").ToLowerInvariant();
                if (cycle == "annual" || cycle == "yearly") return inv.PaymentDate.AddYears(1);
                return inv.PaymentDate.AddMonths(1);
            }

            var activeInvoice = paidInvoices
                .Where(i =>
                {
                    var s = InvoiceStart(i);
                    var e = InvoiceEnd(i);
                    return s <= now && now <= e;
                })
                .OrderByDescending(i => InvoiceStart(i))
                .FirstOrDefault();

            var queuedInvoice = paidInvoices
                .Where(i => InvoiceStart(i) > now)
                .OrderBy(i => InvoiceStart(i))
                .FirstOrDefault();

            var lastPaidInvoice = paidInvoices.FirstOrDefault();

            Pricing activePlan = activeInvoice?.Plan;
            Pricing nextPlanned = queuedInvoice?.Plan;
            Pricing lastPaidPlan = lastPaidInvoice?.Plan;


            bool isTrialActive = user.IsTrialActive;

            bool isPaidActive =
                (activeInvoice != null) ||
                (user.SubscriptionEndDate.HasValue && user.SubscriptionEndDate.Value > now);

            int? currentTierOrder = activePlan?.TierOrder ?? lastPaidPlan?.TierOrder;
            string currentBillingCycle = activeInvoice?.BillingCycle ?? lastPaidInvoice?.BillingCycle ?? "monthly";

            object activePlanDetails = null;

            // -------------------------------------------------
            // TRIAL MODE – treat as Pro Monthly plan
            // -------------------------------------------------
            if (isTrialActive && activeInvoice == null)
            {
                var proPlan = await _mainDb.Pricings
                    .Where(p => p.Name == "Pro" && p.MonthlyPrice != null)
                    .FirstOrDefaultAsync();

                activePlan = proPlan;
                currentTierOrder = proPlan?.TierOrder;
                currentBillingCycle = "monthly";

                activePlanDetails = new
                {
                    planId = proPlan.Id,
                    name = proPlan.Name,
                    tierOrder = proPlan.TierOrder,
                    billingCycle = "monthly",
                    subscriptionStart = user.TrialStartDate,
                    subscriptionEnd = user.TrialEndDate
                };
            }
            else
            {
                activePlanDetails = activeInvoice == null ? null : new
                {
                    planId = activeInvoice.PlanId,
                    name = activePlan?.Name ?? "Unknown",
                    tierOrder = activePlan?.TierOrder,
                    billingCycle = activeInvoice.BillingCycle ?? "null",
                    subscriptionStart = InvoiceStart(activeInvoice),
                    subscriptionEnd = InvoiceEnd(activeInvoice)
                };
            }

            var nextPlannedDetails = queuedInvoice == null ? null : new
            {
                planId = queuedInvoice.PlanId,
                name = nextPlanned?.Name ?? "Unknown",
                tierOrder = nextPlanned?.TierOrder,
                billingCycle = queuedInvoice.BillingCycle ?? "null",
                subscriptionStart = InvoiceStart(queuedInvoice),
                subscriptionEnd = InvoiceEnd(queuedInvoice)
            };

            int activePlanDaysRemaining = 0;

            if (activeInvoice != null)
            {
                var end = InvoiceEnd(activeInvoice);
                var remaining = (int)Math.Ceiling((end - now).TotalDays);
                if (remaining > 0)
                    activePlanDaysRemaining = remaining;
            }
            else if (isTrialActive && user.TrialEndDate.HasValue)
            {
                var remaining = (int)Math.Ceiling((user.TrialEndDate.Value - now).TotalDays);
                if (remaining > 0)
                    activePlanDaysRemaining = remaining;
            }

            int totalDaysRemaining = 0;

            // 1) Active invoice (paid)
            if (activeInvoice != null)
            {
                var end = InvoiceEnd(activeInvoice);
                var remaining = (int)Math.Ceiling((end - now).TotalDays);
                if (remaining > 0)
                    totalDaysRemaining += remaining;
            }

            // 2) Trial plan
            if (user.IsTrialActive && user.TrialEndDate.HasValue)
            {
                var remaining = (int)Math.Ceiling((user.TrialEndDate.Value - now).TotalDays);
                if (remaining > 0)
                    totalDaysRemaining += remaining;
            }

            // 3) Queued future invoice (only 1 — your API exposes only nextPlanned)
            if (queuedInvoice != null)
            {
                var end = InvoiceEnd(queuedInvoice);
                var remaining = (int)Math.Ceiling((end - now).TotalDays);
                if (remaining > 0)
                    totalDaysRemaining += remaining;
            }

            var response = new
            {
                isTrialActive,
                isPaidActive,

                hasActivePlan = isTrialActive || (activeInvoice != null) ||
                                (user.SubscriptionEndDate.HasValue && user.SubscriptionEndDate.Value > now),

                currentPlanId = activePlan?.Id ?? lastPaidPlan?.Id,
                currentTierOrder,
                currentBillingCycle,

                trialStart = user.TrialStartDate,
                trialEnd = user.TrialEndDate,
                subscriptionStart = user.SubscriptionStartDate,
                subscriptionEnd = user.SubscriptionEndDate,
                activePlanDaysRemaining,

                activePlan = activePlanDetails,
                nextPlanned = nextPlannedDetails,

                lastPaidInvoice = lastPaidInvoice == null ? null : new
                {
                    planId = lastPaidInvoice.PlanId,
                    paymentDate = lastPaidInvoice.PaymentDate,
                    billingCycle = lastPaidInvoice.BillingCycle
                },

                totalDaysRemaining
            };

            return Ok(response);
        }


        [HttpGet("current-plan")]
        public async Task<IActionResult> GetCurrentPlan()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var now = DateTimeHelper.GetIndianTime();

            var paidInvoices = await _mainDb.PlanInvoices
                .Include(i => i.Plan)
                .Where(i => i.AppUserId == user.Id && i.Status == "Paid")
                .ToListAsync();

            DateTime InvoiceStart(PlanInvoice inv) => inv.PlanStartDate ?? inv.PaymentDate;
            DateTime InvoiceEnd(PlanInvoice inv)
            {
                if (inv.PlanEndDate.HasValue) return inv.PlanEndDate.Value;
                var cycle = (inv.BillingCycle ?? "monthly").ToLowerInvariant();
                if (cycle == "annual" || cycle == "yearly") return inv.PaymentDate.AddYears(1);
                return inv.PaymentDate.AddMonths(1);
            }

            var activeInvoice = paidInvoices
                .Where(i =>
                {
                    var s = InvoiceStart(i);
                    var e = InvoiceEnd(i);
                    return s <= now && now <= e;
                })
                .OrderByDescending(i => InvoiceStart(i))
                .FirstOrDefault();

            // -------------------------------------------------
            // TRIAL MODE – treat as Pro Monthly plan
            // -------------------------------------------------
            if (activeInvoice == null && user.IsTrialActive)
            {
                var proPlan = await _mainDb.Pricings
                    .Where(p => p.Name == "Pro" && p.MonthlyPrice != null)
                    .FirstOrDefaultAsync();

                return Ok(new
                {
                    hasPlan = true,
                    planId = proPlan.Id,
                    name = proPlan.Name,
                    tier = proPlan.TierOrder,
                    dashboardLimit = proPlan.DashboardLimit,
                    refreshRateMinutes = proPlan.RefreshRateMinutes,
                    excelExport = proPlan.ExcelExport,
                    dashboardAddonEnabled = proPlan.DashboardAddonEnabled,
                    addonDashboards = proPlan.AddonDashboards,
                    addonPrice = proPlan.AddonPrice,
                    totalDashboards = proPlan.DashboardLimit,
                    expiry = user.TrialEndDate
                });
            }

            // No trial, no active paid plan
            if (activeInvoice == null)
                return Ok(new { hasPlan = false });

            // Active paid plan
            var plan = activeInvoice.Plan;

            var addonTotal = await _mainDb.UserAddons
                .Where(a => a.AppUserId == user.Id && a.EndDate > now)
                .SumAsync(a => a.Dashboards);

            return Ok(new
            {
                hasPlan = true,
                planId = plan.Id,
                name = plan.Name,
                tier = plan.TierOrder,
                dashboardLimit = plan.DashboardLimit,
                refreshRateMinutes = plan.RefreshRateMinutes,
                excelExport = plan.ExcelExport,
                dashboardAddonEnabled = plan.DashboardAddonEnabled,
                addonDashboards = plan.AddonDashboards,
                addonPrice = plan.AddonPrice,
                totalDashboards = plan.DashboardLimit + addonTotal,
                expiry = activeInvoice.PlanEndDate ?? InvoiceEnd(activeInvoice)
            });
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


        [HttpGet("invoices")]
        public async Task<IActionResult> GetUserInvoices()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var planinvoices = await _mainDb.PlanInvoices
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
                    i.Status,
                    ProrationCredit = i.ProrationCredit,
                    NetAmount = i.NetAmount,
                    PlanName = i.Plan.Name,
                    BillingCycle = i.BillingCycle,
                    PlanStartDate = i.PlanStartDate ?? i.PaymentDate,
                    PlanEndDate = i.PlanEndDate
                })
                .ToListAsync();

            var addoninvoices = await _mainDb.AddonInvoices
                .Include(i => i.Pricing)
                .Where(i => i.AppUserId == userId)
                .OrderByDescending(i => i.PaymentDate)
                .Select(i => new
                {
                    i.Id,
                    i.InvoiceNumber,
                    i.RazorpayOrderId,
                    i.PaymentDate,
                    i.Amount,
                    i.Status,
                    Dashboards = i.Dashboards,
                    StartDate = i.StartDate,
                    EndDate = i.EndDate
                })
                .ToListAsync();

            return Ok(new
            {
                planinvoices = planinvoices,
                addoninvoices = addoninvoices
            });
        }
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

        public class BuyAddonRequest
        {
            public int PricingId { get; set; } // ID of addon package
        }

        [HttpPost("buy-addon")]
        public async Task<IActionResult> BuyAddon([FromBody] BuyAddonRequest req)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
                return Unauthorized();

            // 1. Read pricing package
            var pricing = await _mainDb.Pricings.FirstOrDefaultAsync(p => p.Id == req.PricingId);
            if (pricing == null)
                return BadRequest("Addon plan not found.");

            var now = DateTimeHelper.GetIndianTime();

            // 2. Check if user has base plan (or is trial)
            Pricing? activePlan;

            if (user.IsTrialActive)
            {
                activePlan = await _mainDb.Pricings.FirstOrDefaultAsync(p => p.TierOrder == 3);
            }
            else
            {
                var invoices = await _mainDb.PlanInvoices
                    .Include(i => i.Plan)
                    .Where(i => i.AppUserId == user.Id && i.Status == "Paid")
                    .OrderByDescending(i => i.PaymentDate)
                    .ToListAsync();

                activePlan = invoices
                    .Where(inv =>
                    {
                        var start = inv.PlanStartDate ?? inv.PaymentDate;
                        var end = inv.PlanEndDate ?? inv.PaymentDate.AddMonths(1);
                        return start <= now && now <= end;
                    })
                    .Select(inv => inv.Plan)
                    .FirstOrDefault();
            }

            if (activePlan == null)
                return BadRequest("You must have an active subscription before buying add-ons.");

            // 3. Check if their plan supports dashboard addons
            if (!activePlan.DashboardAddonEnabled)
                return BadRequest("Your current plan does not support dashboard add-ons.");

            // 4. Create new addon entry (STACKING ENABLED)
            var addon = new UserAddon
            {
                AppUserId = user.Id,
                PricingId = pricing.Id,
                Dashboards = pricing.AddonDashboards,
                Price = pricing.AddonPrice,
                StartDate = now,
                EndDate = now.AddMonths(1)
            };

            _mainDb.UserAddons.Add(addon);
            await _mainDb.SaveChangesAsync();

            await _activityLogger.LogAsync("bought dashboard addon", "User", user.CompanyName ?? user.Email);

            // 5. Calculate updated total limit
            var totalAddonDash = await _mainDb.UserAddons
                .Where(a => a.AppUserId == user.Id && a.IsActive)
                .SumAsync(a => a.Dashboards);

            var finalLimit = activePlan.DashboardLimit + totalAddonDash;

            return Ok(new
            {
                success = true,
                message = "Add-on activated!",
                addedDashboards = pricing.AddonDashboards,
                totalAddonDash = totalAddonDash,
                finalDashboardLimit = finalLimit,
                expiresOn = addon.EndDate
            });
        }

        [HttpGet("addons")]
        public async Task<IActionResult> GetUserAddons()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var now = DateTimeHelper.GetIndianTime();

            var addons = await _mainDb.UserAddons
                .Include(a => a.Pricing)
                .Where(a => a.AppUserId == userId)
                .OrderByDescending(a => a.StartDate)
                .Select(a => new
                {
                    id = a.Id,
                    dashboards = a.Dashboards,
                    price = a.Price,
                    startDate = a.StartDate,
                    endDate = a.EndDate,
                    isActive = a.EndDate > now,
                    pricingName = a.Pricing.Name
                })
                .ToListAsync();

            return Ok(addons);
        }

        public class CreateAddonOrderDto
        {
            public int PricingId { get; set; }
        }

        [HttpPost("create-order")]
        public async Task<IActionResult> CreateAddonOrder([FromBody] CreateAddonOrderDto dto)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var pricing = await _mainDb.Pricings.FindAsync(dto.PricingId);
            if (pricing == null)
                return NotFound("Addon pricing not found");

            if (!pricing.DashboardAddonEnabled)
                return BadRequest("This pricing does not support add-ons.");

            decimal amount = pricing.AddonPrice;
            int amountPaise = (int)(amount * 100);

            var key = _config["Razorpay:KeyId"];
            var secret = _config["Razorpay:KeySecret"];

            var client = _httpFactory.CreateClient();
            var basicAuth = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{key}:{secret}"));
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", basicAuth);

            var payload = new
            {
                amount = amountPaise,
                currency = "INR",
                receipt = $"addon_{Guid.NewGuid():N}",
                notes = new { userId = user.Id, pricingId = pricing.Id, type = "addon" }
            };

            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var resp = await client.PostAsync("https://api.razorpay.com/v1/orders", content);
            var json = await resp.Content.ReadAsStringAsync();

            if (!resp.IsSuccessStatusCode)
                return StatusCode(500, json);

            var doc = JsonDocument.Parse(json);
            string orderId = doc.RootElement.GetProperty("id").GetString()!;

            var order = new RazorpayAddonOrder
            {
                OrderId = orderId,
                AppUserId = user.Id,
                PricingId = pricing.Id,
                Amount = amount,
                CreatedAt = DateTimeHelper.GetIndianTime(),
                Status = "created"
            };

            _mainDb.RazorpayAddonOrders.Add(order);
            await _mainDb.SaveChangesAsync();

            return Ok(new { key, orderId, amount, currency = "INR" });
        }

        public class VerifyAddonPaymentDto
        {
            public string OrderId { get; set; } = "";
            public string PaymentId { get; set; } = "";
            public string Signature { get; set; } = "";
        }

        [HttpPost("verify")]
        public async Task<IActionResult> VerifyAddonPayment([FromBody] VerifyAddonPaymentDto dto)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var dbOrder = await _mainDb.RazorpayAddonOrders
                .Include(o => o.Pricing)
                .FirstOrDefaultAsync(o => o.OrderId == dto.OrderId && o.AppUserId == user.Id);

            if (dbOrder == null)
                return NotFound("Addon order not found.");

            // verify signature
            var secret = _config["Razorpay:KeySecret"];
            string payload = $"{dto.OrderId}|{dto.PaymentId}";
            string expected = CreateSignature(payload, secret);

            if (expected != dto.Signature)
                return BadRequest("Invalid signature");

            dbOrder.PaymentId = dto.PaymentId;
            dbOrder.Status = "paid";
            dbOrder.PaidAt = DateTimeHelper.GetIndianTime();
            await _mainDb.SaveChangesAsync();

            var now = DateTimeHelper.GetIndianTime();

            // CREATE ADDON INVOICE
            var invoice = new AddonInvoice
            {
                AppUserId = user.Id,
                PricingId = dbOrder.PricingId,
                Pricing = dbOrder.Pricing,
                Amount = dbOrder.Amount,
                RazorpayOrderId = dto.OrderId,
                RazorpayPaymentId = dto.PaymentId,
                Status = "Paid",
                CreatedAt = now,
                PaymentDate = now,
                InvoiceNumber = "TEMP",

                // ⭐ THIS NOW WORKS
                Dashboards = dbOrder.Pricing.AddonDashboards,
                StartDate = now,
                EndDate = now.AddMonths(1),
            };

            _mainDb.AddonInvoices.Add(invoice);
            await _mainDb.SaveChangesAsync();

            // ⭐ CORRECT FORMAT
            invoice.InvoiceNumber = $"INV-ADDON-{invoice.Id}";
            await _mainDb.SaveChangesAsync();

            // Activate addon
            var userAddon = new UserAddon
            {
                AppUserId = user.Id,
                PricingId = dbOrder.PricingId,
                Dashboards = dbOrder.Pricing.AddonDashboards,
                Price = dbOrder.Amount,
                StartDate = now,
                EndDate = now.AddMonths(1)
            };

            _mainDb.UserAddons.Add(userAddon);
            await _mainDb.SaveChangesAsync();
            var fileName4 = $"INVOICE_ADDON_{invoice.Id}_{now.ToString("ddMMMyyyy")}_{now.ToString("hhmmtt")}.pdf";

            await _addonInvoiceService.GenerateInvoiceAsync(invoice, fileName4);
            // await _addonInvoiceService.SendInvoiceEmailAsync(invoice);

            return Ok(new { success = true, invoiceNumber = invoice.InvoiceNumber });
        }

        private static string CreateSignature(string payload, string secret)
        {
            using var hmac = new System.Security.Cryptography.HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
            return BitConverter.ToString(hash).Replace("-", "").ToLower();
        }

    }
}
