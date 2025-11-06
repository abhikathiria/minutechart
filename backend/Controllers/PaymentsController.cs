// using Microsoft.AspNetCore.Authorization;
// using Microsoft.AspNetCore.Identity;
// using Microsoft.AspNetCore.Mvc;
// using Microsoft.EntityFrameworkCore;
// using minutechart.Data;
// using minutechart.Models;
// using minutechart.Helpers;
// using minutechart.Services;
// using Stripe.Checkout;

// namespace minutechart.Controllers.Api
// {
//     [ApiController]
//     [Route("api/[controller]")]
//     [Authorize]
//     public class PaymentsController : ControllerBase
//     {
//         private readonly UserManager<AppUser> _userManager;
//         private readonly MinutechartDbContext _db;
//         private readonly ActivityLogger _activityLogger;


//         public PaymentsController(UserManager<AppUser> userManager, MinutechartDbContext db, ActivityLogger activityLogger)
//         {
//             _userManager = userManager;
//             _db = db;
//             _activityLogger = activityLogger;
//         }

//         // 1. Create Stripe Checkout session
//         [HttpPost("create-session")]
//         public async Task<IActionResult> CreateSession([FromBody] PaymentRequest request)
//         {
//             var user = await _userManager.GetUserAsync(User);
//             if (user == null)
//                 return Unauthorized();

//             var plan = await _db.SubscriptionPlans
//                 .FirstOrDefaultAsync(p => p.Name.ToLower() == request.Plan.ToLower());

//             if (plan == null)
//                 return BadRequest(new { message = "Invalid plan." });

//             var options = new SessionCreateOptions
//             {
//                 PaymentMethodTypes = new List<string> { "card" },
//                 LineItems = new List<SessionLineItemOptions>
//                 {
//                     new SessionLineItemOptions
//                     {
//                         PriceData = new SessionLineItemPriceDataOptions
//                         {
//                             Currency = "usd",
//                             UnitAmount = plan.Price, // already stored in cents
//                             ProductData = new SessionLineItemPriceDataProductDataOptions
//                             {
//                                 Name = plan.Name
//                             }
//                         },
//                         Quantity = 1
//                     }
//                 },
//                 Mode = "payment",
//                 SuccessUrl = $"https://yourfrontend.com/payment-success?plan={plan.Name}",
//                 CancelUrl = "https://yourfrontend.com/payment-cancel"
//             };

//             var service = new SessionService();
//             var session = service.Create(options);

//             return Ok(new { url = session.Url });
//         }

//         // 2. Confirm payment (frontend calls after success)
//         [HttpPost("confirm")]
//         public async Task<IActionResult> ConfirmPayment([FromBody] PaymentRequest request)
//         {
//             var user = await _userManager.GetUserAsync(User);
//             if (user == null)
//                 return Unauthorized();

//             var plan = await _db.SubscriptionPlans
//                 .FirstOrDefaultAsync(p => p.Name.ToLower() == request.Plan.ToLower());

//             if (plan == null)
//                 return BadRequest(new { message = "Invalid plan." });

//             var now = DateTimeHelper.GetIndianTime();
//             // user.SubscriptionPlan = plan.Name;
//             user.SubscriptionStartDate = now;
//             user.SubscriptionEndDate = now.AddDays(plan.DurationDays);

//             await _userManager.UpdateAsync(user);

//             return Ok(new
//             {
//                 message = $"Subscription activated: {plan.Name}",
//                 startDate = user.SubscriptionStartDate,
//                 endDate = user.SubscriptionEndDate
//             });
//         }
//     }

//     public class PaymentRequest
//     {
//         public string Plan { get; set; } = ""; // "Monthly", "Quarterly", etc.
//     }
// }


using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using minutechart.Data;
using minutechart.Models;
using minutechart.Helpers;
using minutechart.Services;
using Stripe.Checkout;
using System.Collections.Generic; // Added for List<T>

namespace minutechart.Controllers.Api
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PaymentsController : ControllerBase
    {
        private readonly UserManager<AppUser> _userManager;
        private readonly MinutechartDbContext _db;
        private readonly ActivityLogger _activityLogger;


        public PaymentsController(UserManager<AppUser> userManager, MinutechartDbContext db, ActivityLogger activityLogger)
        {
            _userManager = userManager;
            _db = db;
            _activityLogger = activityLogger;
        }

        // 1. Create Stripe Checkout session
        [HttpPost("create-session")]
        public async Task<IActionResult> CreateSession([FromBody] PaymentRequest request)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
                return Unauthorized();

            var plan = await _db.SubscriptionPlans
                .FirstOrDefaultAsync(p => p.Name.ToLower() == request.Plan.ToLower());

            if (plan == null)
            {
                // LOG: Failed attempt to create session (Invalid plan)
                await _activityLogger.LogAsync("failed to initiate payment for invalid plan", "Subscription", request.Plan);
                return BadRequest(new { message = "Invalid plan." });
            }

            var options = new SessionCreateOptions
            {
                PaymentMethodTypes = new List<string> { "card" },
                LineItems = new List<SessionLineItemOptions>
                {
                    new SessionLineItemOptions
                    {
                        PriceData = new SessionLineItemPriceDataOptions
                        {
                            Currency = "usd",
                            UnitAmount = plan.Price, // already stored in cents
                            ProductData = new SessionLineItemPriceDataProductDataOptions
                            {
                                Name = plan.Name
                            }
                        },
                        Quantity = 1
                    }
                },
                Mode = "payment",
                SuccessUrl = $"https://yourfrontend.com/payment-success?plan={plan.Name}",
                CancelUrl = "https://yourfrontend.com/payment-cancel"
            };

            try
            {
                var service = new SessionService();
                var session = service.Create(options);

                // LOG: Successfully created checkout session
                await _activityLogger.LogAsync("initiated checkout for plan", "Subscription", plan.Name);

                return Ok(new { url = session.Url });
            }
            catch (Exception ex)
            {
                // LOG: Failed to create session (Stripe API error)
                await _activityLogger.LogAsync($"failed to initiate checkout due to API error: {ex.Message.Substring(0, Math.Min(ex.Message.Length, 50))}...", "Subscription", plan.Name);
                return StatusCode(500, new { message = "Failed to create Stripe session.", details = ex.Message });
            }
        }

        // 2. Confirm payment (frontend calls after success)
        [HttpPost("confirm")]
        public async Task<IActionResult> ConfirmPayment([FromBody] PaymentRequest request)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
                return Unauthorized();

            var plan = await _db.SubscriptionPlans
                .FirstOrDefaultAsync(p => p.Name.ToLower() == request.Plan.ToLower());

            if (plan == null)
            {
                // LOG: Failed confirmation (Invalid plan)
                await _activityLogger.LogAsync("failed to confirm payment for invalid plan", "Subscription", request.Plan);
                return BadRequest(new { message = "Invalid plan." });
            }

            var now = DateTimeHelper.GetIndianTime();
            
            // Capture old subscription details for comparison/audit log detail if needed
            var oldEndDate = user.SubscriptionEndDate;

            // user.SubscriptionPlan = plan.Name; // Assuming you have a property for plan name
            user.SubscriptionStartDate = now;
            user.SubscriptionEndDate = now.AddDays(plan.DurationDays);

            var result = await _userManager.UpdateAsync(user);

            if (result.Succeeded)
            {
                // LOG: Successful subscription activation/renewal
                await _activityLogger.LogAsync($"activated subscription to plan {plan.Name}", "Subscription", plan.Name);
            }
            else
            {
                // LOG: Failed update (Identity Error)
                await _activityLogger.LogAsync($"failed to update user details after successful payment for plan {plan.Name}", "Subscription", plan.Name);
                return StatusCode(500, new { message = "Subscription confirmed, but failed to update user record." });
            }


            return Ok(new
            {
                message = $"Subscription activated: {plan.Name}",
                startDate = user.SubscriptionStartDate,
                endDate = user.SubscriptionEndDate
            });
        }
    }

    public class PaymentRequest
    {
        public string Plan { get; set; } = ""; // "Monthly", "Quarterly", etc.
    }
}