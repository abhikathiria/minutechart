using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using minutechart.Data;
using minutechart.Models;
using minutechart.Helpers;
using Stripe.Checkout;

namespace minutechart.Controllers.Api
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PaymentsController : ControllerBase
    {
        private readonly UserManager<AppUser> _userManager;
        private readonly MinutechartDbContext _db;

        public PaymentsController(UserManager<AppUser> userManager, MinutechartDbContext db)
        {
            _userManager = userManager;
            _db = db;
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
                return BadRequest(new { message = "Invalid plan." });

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

            var service = new SessionService();
            var session = service.Create(options);

            return Ok(new { url = session.Url });
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
                return BadRequest(new { message = "Invalid plan." });

            var now = DateTimeHelper.GetIndianTime();
            // user.SubscriptionPlan = plan.Name;
            user.SubscriptionStartDate = now;
            user.SubscriptionEndDate = now.AddDays(plan.DurationDays);

            await _userManager.UpdateAsync(user);

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
