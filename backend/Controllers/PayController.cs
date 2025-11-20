// using Microsoft.AspNetCore.Authorization;
// using Microsoft.AspNetCore.Identity;
// using Microsoft.AspNetCore.Mvc;
// using Microsoft.EntityFrameworkCore;
// using minutechart.Data;
// using minutechart.Models;
// using minutechart.Services;
// using minutechart.Helpers;
// using Stripe.Checkout;
// using System.Collections.Generic;

// namespace minutechart.Controllers.Api
// {
//     [ApiController]
//     [Route("api/[controller]")]
//     [Authorize]
//     public class PayController : ControllerBase
//     {
//         private readonly UserManager<AppUser> _userManager;
//         private readonly MinutechartDbContext _db;
//         private readonly ActivityLogger _activityLogger;
//         private readonly SubscriptionService _subscriptionService;
//         private readonly IConfiguration _config;

//         public PayController(UserManager<AppUser> userManager, MinutechartDbContext db, ActivityLogger activityLogger, SubscriptionService subscriptionService, IConfiguration config)
//         {
//             _userManager = userManager;
//             _db = db;
//             _activityLogger = activityLogger;
//             _subscriptionService = subscriptionService;
//             _config = config;
//         }

//         [HttpPost("create-session")]
//         public async Task<IActionResult> CreateSession([FromBody] PayRequest request)
//         {
//             var user = await _userManager.GetUserAsync(User);
//             if (user == null) return Unauthorized();

//             var plan = await _db.Pricings.FirstOrDefaultAsync(p => p.Id == request.PlanId);
//             if (plan == null) return BadRequest(new { message = "Invalid plan." });

//             var billingCycle = (request.BillingCycle ?? "monthly").ToLowerInvariant();
//             var intent = (request.Intent ?? "purchase").ToLowerInvariant();
//             decimal gross = billingCycle == "annual" ? plan.AnnualPrice : plan.MonthlyPrice;
//             decimal proration = 0m;
//             decimal net = gross;

//             // Determine last paid invoice
//             var lastInvoice = await _db.PlanInvoices.Where(i => i.AppUserId == user.Id && i.Status == "Paid").OrderByDescending(i => i.PaymentDate).FirstOrDefaultAsync();
//             Pricing currentPricing = null;
//             string currentBilling = "monthly";
//             if (lastInvoice != null)
//             {
//                 currentPricing = await _db.Pricings.FindAsync(lastInvoice.PlanId);
//                 currentBilling = lastInvoice.BillingCycle ?? "monthly";
//             }

//             if (intent == "upgrade_immediate")
//             {
//                 if (currentPricing != null && currentPricing.TierOrder < plan.TierOrder && user.SubscriptionEndDate.HasValue && user.SubscriptionEndDate.Value > DateTimeHelper.GetIndianTime())
//                 {
//                     proration = _subscriptionService.CalculateProrationCredit(user, currentPricing, currentBilling, DateTimeHelper.GetIndianTime());
//                     net = Math.Max(0m, gross - proration);
//                 }
//                 else if (user.IsTrialActive && plan.TierOrder > (await GetTrialPlanTier()))
//                 {
//                     net = gross;
//                     proration = 0m;
//                 }
//                 else
//                 {
//                     intent = "purchase";
//                     net = gross;
//                 }
//             }
//             else if (intent == "addon")
//             {
//                 net = plan.AddonPrice;
//                 gross = net;
//             }

//             var domain = _config["App:PublicUrl"] ?? $"{Request.Scheme}://{Request.Host}";
//             var options = new SessionCreateOptions
//             {
//                 PaymentMethodTypes = new List<string> { "card" },
//                 LineItems = new List<SessionLineItemOptions>
//                 {
//                     new SessionLineItemOptions
//                     {
//                         PriceData = new SessionLineItemPriceDataOptions
//                         {
//                             Currency = "inr",
//                             UnitAmount = (long)(net * 100M),
//                             ProductData = new SessionLineItemPriceDataProductDataOptions
//                             {
//                                 Name = plan.Name
//                             }
//                         },
//                         Quantity = 1
//                     }
//                 },
//                 Mode = "payment",
//                 SuccessUrl = $"{domain}/payment-success?planId={plan.Id}&billingCycle={billingCycle}&intent={intent}",
//                 CancelUrl = $"{domain}/payment-cancel"
//             };

//             try
//             {
//                 var service = new SessionService();
//                 var session = service.Create(options);

//                 await _activity_logger_log("initiated stripe checkout", "Subscription", $"{user.Id} plan:{plan.Name} intent:{intent}");
//                 return Ok(new { url = session.Url });
//             }
//             catch (System.Exception ex)
//             {
//                 await _activity_logger_log($"failed to initiate stripe checkout: {ex.Message}", "Subscription", plan.Name);
//                 return StatusCode(500, new { message = "Failed to create Stripe session.", details = ex.Message });
//             }
//         }

//         // Confirm endpoint: frontend calls after successful Stripe payment
//         [HttpPost("confirm")]
//         public async Task<IActionResult> ConfirmPayment([FromBody] PayRequest request)
//         {
//             var user = await _user_manager_get_user();
//             if (user == null) return Unauthorized();

//             var plan = await _db.Pricings.FirstOrDefaultAsync(p => p.Id == request.PlanId);
//             if (plan == null) return BadRequest(new { message = "Invalid plan." });

//             var billingCycle = (request.BillingCycle ?? "monthly").ToLowerInvariant();
//             var intent = (request.Intent ?? "purchase").ToLowerInvariant();

//             var now = DateTimeHelper.GetIndianTime();

//             // Mirror logic from Razorpay verify:
//             if (user.IsTrialActive && plan.TierOrder <= (await GetTrialPlanTier()))
//             {
//                 // schedule after trial
//                 var effective = user.TrialEndDate.HasValue ? user.TrialEndDate.Value.AddSeconds(1) : now;
//                 await _subscriptionService.SchedulePlanChangeAsync(user, plan.Id, billingCycle, effective);

//                 var invSched = new PlanInvoice
//                 {
//                     AppUserId = user.Id,
//                     PlanId = plan.Id,
//                     Plan = plan,
//                     BillingCycle = billingCycle,
//                     Amount = billingCycle == "annual" ? plan.AnnualPrice : plan.MonthlyPrice,
//                     ProrationCredit = 0m,
//                     NetAmount = billingCycle == "annual" ? plan.AnnualPrice : plan.MonthlyPrice,
//                     PaymentDate = now,
//                     PlanStartDate = effective,
//                     PlanEndDate = effective.AddDays(billingCycle == "annual" ? 365 : 30),
//                     Currency = "INR",
//                     Status = "Paid"
//                 };
//                 _db.PlanInvoices.Add(invSched);
//                 await _db.SaveChangesAsync();

//                 return Ok(new { success = true, message = "Purchase queued to start after trial ends", effectiveDate = effective });
//             }

//             // else start/extend immediately
//             int durationDays = billingCycle == "annual" ? 365 : 30;
//             if (user.SubscriptionEndDate.HasValue && user.SubscriptionEndDate.Value > now)
//                 user.SubscriptionEndDate = user.SubscriptionEndDate.Value.AddDays(durationDays);
//             else
//             {
//                 user.SubscriptionStartDate = now;
//                 user.SubscriptionEndDate = now.AddDays(durationDays);
//             }
//             await _userManager.UpdateAsync(user);

//             var invoice = new PlanInvoice
//             {
//                 AppUserId = user.Id,
//                 PlanId = plan.Id,
//                 Plan = plan,
//                 BillingCycle = billingCycle,
//                 Amount = billingCycle == "annual" ? plan.AnnualPrice : plan.MonthlyPrice,
//                 ProrationCredit = 0m,
//                 NetAmount = billingCycle == "annual" ? plan.AnnualPrice : plan.MonthlyPrice,
//                 PaymentDate = now,
//                 PlanStartDate = user.SubscriptionStartDate,
//                 PlanEndDate = user.SubscriptionEndDate,
//                 Currency = "INR",
//                 Status = "Paid"
//             };
//             _db.PlanInvoices.Add(invoice);
//             await _db.SaveChangesAsync();

//             await _activity_logger_log("stripe payment confirmed and subscription applied", "Subscription", $"{user.Id} plan:{plan.Name}");
//             return Ok(new { success = true, start = invoice.PlanStartDate, end = invoice.PlanEndDate });
//         }

//         private async Task<int> GetTrialPlanTier()
//         {
//             var pro = await _db.Pricings.FirstOrDefaultAsync(p => p.Name.ToLower() == "pro");
//             return pro?.TierOrder ?? 3;
//         }

//         // small helpers to wrap activity logger and user retrieval for clarity
//         private Task _activity_logger_log(string a, string b, string c) => _activityLogger.LogAsync(a, b, c);
//         private Task<AppUser> _user_manager_get_user() => _userManager.GetUserAsync(User);
//     }

//     public class PayRequest
//     {
//         public int PlanId { get; set; }
//         public string BillingCycle { get; set; } = "monthly";
//         public string Intent { get; set; } = "purchase";
//     }
// }



using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using minutechart.Data;
using minutechart.Models;
using minutechart.Services;
using minutechart.Helpers;
using Stripe.Checkout;
using System.Collections.Generic;

namespace minutechart.Controllers.Api
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PayController : ControllerBase
    {
        private readonly UserManager<AppUser> _userManager;
        private readonly MinutechartDbContext _db;
        private readonly ActivityLogger _logger;
        private readonly SubscriptionTimelineManager _timeline;
        private readonly SubscriptionServiceV2 _subscriptionService;
        private readonly IConfiguration _config;

        public PayController(
            UserManager<AppUser> userManager,
            MinutechartDbContext db,
            ActivityLogger logger,
            SubscriptionTimelineManager timeline,
            SubscriptionServiceV2 subscriptionService,
            IConfiguration config)
        {
            _userManager = userManager;
            _db = db;
            _logger = logger;
            _timeline = timeline;
            _subscriptionService = subscriptionService;
            _config = config;
        }

        // ------------------------------------------------------------
        // CREATE STRIPE SESSION
        // ------------------------------------------------------------
        [HttpPost("create-session")]
        public async Task<IActionResult> CreateSession([FromBody] PayRequest request)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var plan = await _db.Pricings.FindAsync(request.PlanId);
            if (plan == null) return BadRequest("Invalid plan");

            var billing = request.BillingCycle.ToLowerInvariant();
            var intent = request.Intent.ToLowerInvariant();

            decimal gross = billing == "annual" ? plan.AnnualPrice : plan.MonthlyPrice;
            decimal proration = 0m;
            decimal amountToCharge = gross;

            var now = DateTimeHelper.GetIndianTime();
            var active = await _timeline.GetActiveAsync(user.Id, now);

            if (intent == "upgrade_immediate" && active != null && plan.TierOrder > active.Plan.TierOrder)
            {
                proration = _timeline.CalculateProrationCredit(active, now);
                amountToCharge = Math.Max(0m, gross - proration);
            }
            else
            {
                intent = "purchase";
            }

            var domain = _config["App:PublicUrl"];

            var options = new SessionCreateOptions
            {
                PaymentMethodTypes = new List<string> { "card" },
                LineItems = new List<SessionLineItemOptions>
                {
                    new SessionLineItemOptions
                    {
                        PriceData = new SessionLineItemPriceDataOptions
                        {
                            Currency = "inr",
                            UnitAmount = (long)(amountToCharge * 100),
                            ProductData = new SessionLineItemPriceDataProductDataOptions
                            {
                                Name = plan.Name
                            }
                        },
                        Quantity = 1
                    }
                },
                Mode = "payment",
                SuccessUrl = $"{domain}/stripe/success?planId={plan.Id}&billingCycle={billing}&proration={proration}",
                CancelUrl = $"{domain}/stripe/cancel"
            };

            var service = new SessionService();
            var session = service.Create(options);

            return Ok(new { url = session.Url });
        }

        // ------------------------------------------------------------
        // CONFIRM STRIPE PAYMENT
        // ------------------------------------------------------------
        [HttpPost("confirm")]
        public async Task<IActionResult> Confirm([FromBody] PayRequest request)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var plan = await _db.Pricings.FindAsync(request.PlanId);
            if (plan == null) return BadRequest("Invalid plan");

            var billing = request.BillingCycle.ToLowerInvariant();
            decimal proration = request.ProrationUsed;
            decimal gross = billing == "annual" ? plan.AnnualPrice : plan.MonthlyPrice;
            decimal amountCharged = Math.Max(0m, gross - proration);

            // Apply subscription through new engine
            var invoice = await _subscriptionService.ApplyPurchaseAsync(
                user,
                plan,
                billing,
                amountCharged,
                proration,
                "stripe",
                Guid.NewGuid().ToString()
            );

            return Ok(new
            {
                success = true,
                invoiceNumber = invoice.InvoiceNumber,
                start = invoice.PlanStartDate,
                end = invoice.PlanEndDate
            });
        }
    }

    public class PayRequest
    {
        public int PlanId { get; set; }
        public string BillingCycle { get; set; }
        public string Intent { get; set; }
        public decimal ProrationUsed { get; set; }
    }
}
