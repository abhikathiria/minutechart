// using System;
// using System.IO;
// using System.Linq;
// using System.Text;
// using System.Text.Json;
// using System.Threading.Tasks;
// using System.Security.Claims;
// using System.Net.Http.Headers;

// using Microsoft.AspNetCore.Authorization;
// using Microsoft.AspNetCore.Identity;
// using Microsoft.AspNetCore.Mvc;
// using Microsoft.EntityFrameworkCore;
// using Microsoft.Extensions.Configuration;

// using minutechart.Models;
// using minutechart.Data;
// using minutechart.Services;
// using minutechart.Helpers;

// namespace minutechart.Controllers.Api
// {
//     [ApiController]
//     [Route("api/[controller]")]
//     [Authorize]
//     public class PlanController : ControllerBase
//     {
//         private readonly MinutechartDbContext _db;
//         private readonly UserManager<AppUser> _userManager;
//         private readonly IConfiguration _config;
//         private readonly IHttpClientFactory _httpFactory;
//         private readonly ActivityLogger _activityLogger;
//         private readonly SubscriptionService _subscriptionService;
//         private readonly PlanInvoiceService _planInvoiceService;
//         private readonly IWebHostEnvironment _webHostEnvironment;

//         public PlanController(
//             MinutechartDbContext db,
//             UserManager<AppUser> userManager,
//             IConfiguration config,
//             IHttpClientFactory httpFactory,
//             ActivityLogger activityLogger,
//             SubscriptionService subscriptionService,
//             PlanInvoiceService planInvoiceService,
//             IWebHostEnvironment webHostEnvironment)
//         {
//             _db = db;
//             _userManager = userManager;
//             _config = config;
//             _httpFactory = httpFactory;
//             _activityLogger = activityLogger;
//             _subscriptionService = subscriptionService;
//             _planInvoice_service_null_check(planInvoiceService);
//             _planInvoiceService = planInvoiceService;
//             _webHostEnvironment = webHostEnvironment;
//         }

//         // POST api/plan/create-order
//         [HttpPost("create-order")]
//         public async Task<IActionResult> CreateOrder([FromBody] CreatePlanOrderDto dto)
//         {
//             var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
//             if (string.IsNullOrEmpty(userId)) return Unauthorized();

//             var user = await _userManager.FindByIdAsync(userId);
//             if (user == null) return Unauthorized();

//             var plan = await _db.Pricings.FindAsync(dto.PlanId);
//             if (plan == null)
//             {
//                 await _activity_logger_log("failed to create order: plan not found", "Subscription", $"PlanID:{dto.PlanId}");
//                 return NotFound("Plan not found");
//             }

//             var billingCycle = (dto.BillingCycle ?? "monthly").ToLowerInvariant();
//             var intent = (dto.Intent ?? "purchase").ToLowerInvariant();

//             decimal grossPrice = billingCycle == "annual" ? plan.AnnualPrice : plan.MonthlyPrice;
//             decimal prorationCredit = 0m;
//             decimal amountToCharge = grossPrice;

//             // Determine current paid plan via latest paid invoice (if any)
//             var lastPaidInvoice = await _db.PlanInvoices
//                 .Where(i => i.AppUserId == userId && i.Status == "Paid")
//                 .OrderByDescending(i => i.PaymentDate)
//                 .FirstOrDefaultAsync();

//             Pricing currentPricing = null;
//             string currentBilling = "monthly";
//             if (lastPaidInvoice != null)
//             {
//                 currentPricing = await _db.Pricings.FindAsync(lastPaidInvoice.PlanId);
//                 currentBilling = lastPaidInvoice.BillingCycle ?? "monthly";
//             }

//             // INTENT handling
//             if (intent == "upgrade_immediate")
//             {
//                 if (currentPricing != null
//                     && currentPricing.TierOrder < plan.TierOrder
//                     && user.SubscriptionEndDate.HasValue
//                     && user.SubscriptionEndDate.Value > DateTimeHelper.GetIndianTime())
//                 {
//                     prorationCredit = _subscription_service_calculate(user, currentPricing, currentBilling);
//                     amountToCharge = Math.Max(0m, grossPrice - prorationCredit);
//                 }
//                 else if (user.IsTrialActive && plan.TierOrder > (await GetTrialPlanTier()).GetValueOrDefault(0))
//                 {
//                     // trial -> immediate allowed; no proration for trial in your logic
//                     prorationCredit = 0m;
//                     amountToCharge = grossPrice;
//                 }
//                 else
//                 {
//                     // fallback
//                     intent = "purchase";
//                     amountToCharge = grossPrice;
//                     prorationCredit = 0m;
//                 }
//             }
//             else if (intent == "addon")
//             {
//                 // You requested addon invoices be handled separately later.
//                 // But keep flow stable — charge addon price if plan has one.
//                 amountToCharge = plan.AddonPrice;
//                 grossPrice = plan.AddonPrice;
//             }

//             var amountPaise = Convert.ToInt32(amountToCharge * 100M);

//             // Razorpay auth
//             var keyId = _config["Razorpay:KeyId"];
//             var keySecret = _config["Razorpay:KeySecret"];
//             if (string.IsNullOrEmpty(keyId) || string.IsNullOrEmpty(keySecret))
//                 return StatusCode(500, "Razorpay not configured");

//             var client = _httpFactory.CreateClient();
//             var basicAuth = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{keyId}:{keySecret}"));
//             client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", basicAuth);

//             var payload = new
//             {
//                 amount = amountPaise,
//                 currency = "INR",
//                 receipt = $"rcpt_{Guid.NewGuid():N}",
//                 notes = new { planId = plan.Id.ToString(), userId = user.Id, billingCycle = billingCycle, intent = intent, prorate = prorationCredit }
//             };

//             var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
//             var resp = await client.PostAsync("https://api.razorpay.com/v1/orders", content);
//             var respString = await resp.Content.ReadAsStringAsync();

//             if (!resp.IsSuccessStatusCode)
//             {
//                 await _activity_logger_log($"failed to create order: razorpay api error - {respString}", "Subscription", plan.Name);
//                 return StatusCode(500, $"Failed to create order: {respString}");
//             }

//             using var doc = JsonDocument.Parse(respString);
//             var orderId = doc.RootElement.GetProperty("id").GetString()!;
//             var orderAmountPaise = doc.RootElement.GetProperty("amount").GetInt32();
//             var orderAmountRupees = orderAmountPaise / 100.0M;

//             var payOrder = new RazorpayPlanOrder
//             {
//                 OrderId = orderId,
//                 AppUserId = user.Id,
//                 PlanId = plan.Id,
//                 BillingCycle = billingCycle,
//                 Intent = intent,
//                 ProrationCredit = prorationCredit,
//                 Amount = orderAmountRupees,
//                 Status = "created",
//                 CreatedAt = DateTimeHelper.GetIndianTime()
//             };

//             _db.RazorpayPlanOrders.Add(payOrder);
//             await _db.SaveChangesAsync();

//             await _activity_logger_log("initiated order for plan", "Subscription", $"{plan.Name} ({billingCycle}) intent:{intent}");

//             // Response for frontend
//             return Ok(new
//             {
//                 orderId,
//                 amount = orderAmountRupees,
//                 currency = "INR",
//                 key = keyId
//             });
//         }

//         // POST api/plan/verify
//         [HttpPost("verify")]
//         public async Task<IActionResult> VerifyPayment([FromBody] VerifyPlanPaymentDto dto)
//         {
//             var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
//             if (string.IsNullOrEmpty(userId)) return Unauthorized();

//             var orderRecord = await _db.RazorpayPlanOrders
//                 .FirstOrDefaultAsync(o => o.OrderId == dto.OrderId && o.AppUserId == userId);

//             if (orderRecord == null)
//             {
//                 await _activity_logger_log("failed to verify payment: order record not found", "Payment", dto.OrderId);
//                 return NotFound("Order record not found");
//             }

//             var keySecret = _config["Razorpay:KeySecret"];
//             if (!VerifySignature(dto.OrderId, dto.PaymentId, dto.Signature, keySecret))
//             {
//                 await _activity_logger_log("failed to verify payment: invalid signature", "Payment", dto.OrderId);
//                 return BadRequest("Invalid signature");
//             }

//             // mark order paid
//             orderRecord.PaymentId = dto.PaymentId;
//             orderRecord.Status = "paid";
//             orderRecord.PaidAt = DateTimeHelper.GetIndianTime();
//             await _db.SaveChangesAsync();

//             var plan = await _db.Pricings.FindAsync(orderRecord.PlanId);
//             if (plan == null) return NotFound("Plan not found");

//             var now = DateTimeHelper.GetIndianTime();
//             var user = await _userManager.FindByIdAsync(userId);

//             // Branch on intent
//             switch ((orderRecord.Intent ?? "purchase").ToLowerInvariant())
//             {
//                 // Immediate upgrade — use SubscriptionService helper that creates the invoice
//                 case "upgrade_immediate":
//                     {
//                         decimal proration = orderRecord.ProrationCredit;
//                         decimal gross = orderRecord.Amount + proration;

//                         // Apply immediate upgrade and get the created PlanInvoice
//                         var invoice = await _subscriptionService.ApplyImmediateUpgradeAsync(
//                             user,
//                             plan,
//                             orderRecord.BillingCycle ?? "monthly",
//                             gross,
//                             proration,
//                             now,
//                             "razorpay",
//                             dto.PaymentId
//                         );

//                         invoice.RazorpayOrderId = orderRecord.OrderId;
//                         invoice.RazorpayPaymentId = dto.PaymentId;

//                         // Ensure invoice has InvoiceNumber
//                         if (string.IsNullOrEmpty(invoice.InvoiceNumber) || invoice.InvoiceNumber == "TEMP")
//                         {
//                             invoice.InvoiceNumber = $"INV-{invoice.Id}";
//                             _db.PlanInvoices.Update(invoice);
//                             await _db.SaveChangesAsync();
//                         }
//                         else
//                         {
//                             // ensure saved fields persisted
//                             _db.PlanInvoices.Update(invoice);
//                             await _db.SaveChangesAsync();
//                         }

//                         // Generate PDF and email
//                         var fileName = $"INVOICE_{invoice.Id}_{now.ToString("ddMMMyyyy")}_{now.ToString("hhmmtt")}.pdf";
//                         await _planInvoiceService.GenerateInvoiceAsync(invoice, fileName);
//                         await _planInvoiceService.SendInvoiceEmailAsync(invoice);

//                         await _activity_logger_log("immediate-upgrade-applied-and-invoice-sent", "Subscription", $"{user.Id} -> {plan.Name}");

//                         return Ok(new
//                         {
//                             success = true,
//                             invoiceNumber = invoice.InvoiceNumber,
//                             subscriptionStart = invoice.PlanStartDate,
//                             subscriptionEnd = invoice.PlanEndDate
//                         });
//                     }

//                 // Queued upgrade — schedule and create a scheduled PlanInvoice record
//                 case "upgrade_queued":
//                     {
//                         DateTime effective;
//                         if (user.IsTrialActive && user.TrialEndDate.HasValue && user.TrialEndDate.Value > now)
//                             effective = user.TrialEndDate.Value.AddSeconds(1);
//                         else if (user.SubscriptionEndDate.HasValue && user.SubscriptionEndDate.Value > now)
//                             effective = user.SubscriptionEndDate.Value.AddSeconds(1);
//                         else
//                             effective = now;

//                         await _subscription_service_schedule(user, plan.Id, orderRecord.BillingCycle ?? "monthly", effective);

//                         var invSched = new PlanInvoice
//                         {
//                             AppUserId = user.Id,
//                             PlanId = plan.Id,
//                             Plan = plan,
//                             BillingCycle = orderRecord.BillingCycle ?? "monthly",
//                             Amount = orderRecord.Amount,
//                             ProrationCredit = orderRecord.ProrationCredit,
//                             NetAmount = orderRecord.Amount - orderRecord.ProrationCredit,
//                             PaymentDate = now,
//                             PlanStartDate = effective,
//                             PlanEndDate = effective.AddDays((orderRecord.BillingCycle == "annual") ? 365 : 30),
//                             Currency = "INR",
//                             Status = "Paid",
//                             InvoiceNumber = "TEMP",
//                             RazorpayOrderId = orderRecord.OrderId,
//                             RazorpayPaymentId = dto.PaymentId
//                         };

//                         _db.PlanInvoices.Add(invSched);
//                         await _db.SaveChangesAsync();

//                         // Assign real invoice number and update
//                         invSched.InvoiceNumber = $"INV-{invSched.Id}";
//                         _db.PlanInvoices.Update(invSched);
//                         await _db.SaveChangesAsync();

//                         // Generate PDF and email
//                         var fileName2 = $"INVOICE_{invSched.Id}_{now.ToString("ddMMMyyyy")}_{now.ToString("hhmmtt")}.pdf";
//                         await _planInvoiceService.GenerateInvoiceAsync(invSched, fileName2);
//                         await _planInvoiceService.SendInvoiceEmailAsync(invSched);

//                         await _activity_logger_log("scheduled-upgrade-invoice-created", "Subscription", $"{user.Id} -> {plan.Name} effective:{effective}");

//                         return Ok(new { success = true, message = "Plan scheduled", effectiveDate = effective });
//                     }

//                 // Addon: skipped (per your request addons will be invoiced separately).
//                 // We still keep a safe response in case frontend sends 'addon' intent.
//                 case "addon":
//                     {
//                         await _activity_logger_log("addon-intent-received-but-disabled", "Subscription", $"{user.Id} plan:{plan.Name}");
//                         return BadRequest(new { success = false, message = "Addon purchases are not handled in this flow. They will be invoiced separately." });
//                     }

//                 // Normal purchase / renewal
//                 default:
//                     {
//                         int durationDays = (orderRecord.BillingCycle ?? "monthly").ToLowerInvariant() == "annual" ? 365 : 30;

//                         // Update subscription dates
//                         if (user.SubscriptionEndDate.HasValue && user.SubscriptionEndDate.Value > now)
//                         {
//                             user.SubscriptionEndDate = user.SubscriptionEndDate.Value.AddDays(durationDays);
//                         }
//                         else
//                         {
//                             user.SubscriptionStartDate = now;
//                             user.SubscriptionEndDate = now.AddDays(durationDays);
//                         }
//                         await _userManager.UpdateAsync(user);

//                         // Create PlanInvoice record with TEMP invoice number (to avoid NULL column insert)
//                         var invoice = new PlanInvoice
//                         {
//                             AppUserId = user.Id,
//                             PlanId = plan.Id,
//                             Plan = plan,
//                             BillingCycle = orderRecord.BillingCycle ?? "monthly",
//                             Amount = orderRecord.Amount,
//                             ProrationCredit = orderRecord.ProrationCredit,
//                             NetAmount = Math.Max(0m, orderRecord.Amount - orderRecord.ProrationCredit),
//                             PaymentDate = now,
//                             PlanStartDate = user.SubscriptionStartDate,
//                             PlanEndDate = user.SubscriptionEndDate,
//                             Currency = "INR",
//                             Status = "Paid",
//                             InvoiceNumber = "TEMP",
//                             RazorpayOrderId = orderRecord.OrderId,
//                             RazorpayPaymentId = dto.PaymentId
//                         };

//                         _db.PlanInvoices.Add(invoice);
//                         await _db.SaveChangesAsync();

//                         // Now update InvoiceNumber (use Id)
//                         invoice.InvoiceNumber = $"INV-{invoice.Id}";
//                         _db.PlanInvoices.Update(invoice);
//                         await _db.SaveChangesAsync();

//                         // Generate PDF and send email
//                         var fileName4 = $"INVOICE_{invoice.Id}_{now.ToString("ddMMMyyyy")}_{now.ToString("hhmmtt")}.pdf";
//                         await _planInvoiceService.GenerateInvoiceAsync(invoice, fileName4);
//                         await _planInvoiceService.SendInvoiceEmailAsync(invoice);

//                         await _activity_logger_log("purchase-applied-and-invoice-sent", "Subscription", $"{user.Id} purchased {plan.Name}");

//                         return Ok(new
//                         {
//                             success = true,
//                             invoiceNumber = invoice.InvoiceNumber,
//                             start = invoice.PlanStartDate,
//                             end = invoice.PlanEndDate
//                         });
//                     }
//             }
//         }

//         // Helper: trial plan tier (Pro)
//         private async Task<int?> GetTrialPlanTier()
//         {
//             var pro = await _db.Pricings.FirstOrDefaultAsync(p => p.Name.ToLower() == "pro");
//             return pro?.TierOrder;
//         }

//         // small internal wrappers to keep code compact
//         private decimal _subscription_service_calculate(AppUser user, Pricing currentPricing, string currentBilling)
//             => _subscriptionService.CalculateProrationCredit(user, currentPricing, currentBilling, DateTimeHelper.GetIndianTime());

//         private Task _subscription_service_schedule(AppUser user, int planId, string billing, DateTime effective)
//             => _subscriptionService.SchedulePlanChangeAsync(user, planId, billing, effective);

//         private Task _activity_logger_log(string action, string area, string details)
//             => _activityLogger.LogAsync(action, area, details);


//         [HttpGet("download-invoice/{orderId}")]
//         public async Task<IActionResult> DownloadInvoice(string orderId)
//         {
//             var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
//             if (string.IsNullOrEmpty(userId))
//                 return Unauthorized();

//             // -----------------------------------------
//             // 1) Try PLAN INVOICE first
//             // -----------------------------------------
//             var planInvoice = await _db.PlanInvoices
//                 .FirstOrDefaultAsync(i => i.RazorpayOrderId == orderId && i.AppUserId == userId);

//             if (planInvoice != null)
//             {
//                 if (string.IsNullOrEmpty(planInvoice.PdfPath))
//                 {
//                     await _activityLogger.LogAsync("invoice download failed: PDF path missing", "PlanInvoice", orderId);
//                     return NotFound();
//                 }

//                 var fullPath = Path.Combine(_webHostEnvironment.WebRootPath, planInvoice.PdfPath.TrimStart('/'));

//                 if (!System.IO.File.Exists(fullPath))
//                 {
//                     await _activityLogger.LogAsync("invoice download failed: file missing on server", "PlanInvoice", planInvoice.InvoiceNumber);
//                     return NotFound();
//                 }

//                 var bytes = await System.IO.File.ReadAllBytesAsync(fullPath);
//                 await _activityLogger.LogAsync("invoice downloaded", "PlanInvoice", planInvoice.InvoiceNumber);

//                 return File(bytes, "application/pdf", Path.GetFileName(fullPath));
//             }

//             // -----------------------------------------
//             // 2) Try ADD-ON INVOICE
//             // -----------------------------------------
//             var addonInvoice = await _db.AddonInvoices
//                 .FirstOrDefaultAsync(i => i.RazorpayOrderId == orderId && i.AppUserId == userId);

//             if (addonInvoice != null)
//             {
//                 if (string.IsNullOrEmpty(addonInvoice.PdfPath))
//                 {
//                     await _activityLogger.LogAsync("invoice download failed: PDF path missing", "AddonInvoice", orderId);
//                     return NotFound();
//                 }

//                 var fullPath = Path.Combine(_webHostEnvironment.WebRootPath, addonInvoice.PdfPath.TrimStart('/'));

//                 if (!System.IO.File.Exists(fullPath))
//                 {
//                     await _activityLogger.LogAsync("invoice download failed: file missing on server", "AddonInvoice", addonInvoice.InvoiceNumber);
//                     return NotFound();
//                 }

//                 var bytes = await System.IO.File.ReadAllBytesAsync(fullPath);
//                 await _activityLogger.LogAsync("invoice downloaded", "AddonInvoice", addonInvoice.InvoiceNumber);

//                 return File(bytes, "application/pdf", Path.GetFileName(fullPath));
//             }

//             // -----------------------------------------
//             // 3) No invoice found
//             // -----------------------------------------
//             await _activityLogger.LogAsync("invoice download failed: order not found", "Invoice", orderId);
//             return NotFound();
//         }

//         // Razorpay signature verify
//         private bool VerifySignature(string orderId, string paymentId, string signature, string secret)
//         {
//             var payload = $"{orderId}|{paymentId}";
//             var key = Encoding.UTF8.GetBytes(secret);
//             using var hmac = new System.Security.Cryptography.HMACSHA256(key);
//             var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
//             var expected = BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
//             return expected == signature;
//         }

//         // simple null-check for PlanInvoiceService in ctor path (avoid CS warning)
//         private void _planInvoice_service_null_check(PlanInvoiceService s)
//         {
//             if (s == null) throw new ArgumentNullException(nameof(s), "PlanInvoiceService is required and must be registered in DI.");
//         }
//     }

//     // DTOs
//     public class CreatePlanOrderDto
//     {
//         public int PlanId { get; set; }
//         public string BillingCycle { get; set; } = "monthly"; // monthly | annual
//         public string Intent { get; set; } = "purchase"; // purchase | upgrade_immediate | upgrade_queued | addon
//     }

//     public class VerifyPlanPaymentDto
//     {
//         public string OrderId { get; set; } = null!;
//         public string PaymentId { get; set; } = null!;
//         public string Signature { get; set; } = null!;
//     }
// }


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

namespace minutechart.Controllers.Api
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PlanController : ControllerBase
    {
        private readonly MinutechartDbContext _db;
        private readonly UserManager<AppUser> _userManager;
        private readonly IConfiguration _config;
        private readonly IHttpClientFactory _httpFactory;
        private readonly ActivityLogger _activityLogger;
        private readonly SubscriptionTimelineManager _timeline;
        private readonly SubscriptionServiceV2 _subscriptionService;
        private readonly PlanInvoiceService _planInvoiceService;
        private readonly IWebHostEnvironment _env;

        public PlanController(
            MinutechartDbContext db,
            UserManager<AppUser> userManager,
            IConfiguration config,
            IHttpClientFactory httpFactory,
            ActivityLogger activityLogger,
            SubscriptionTimelineManager timeline,
            SubscriptionServiceV2 subscriptionService,
            PlanInvoiceService planInvoiceService,
            IWebHostEnvironment env)
        {
            _db = db;
            _userManager = userManager;
            _config = config;
            _httpFactory = httpFactory;
            _activityLogger = activityLogger;
            _timeline = timeline;
            _subscriptionService = subscriptionService;
            _planInvoiceService = planInvoiceService;
            _env = env;
        }

        // --------------------------------------------------------
        //  POST: CREATE PAYMENT ORDER (RAZORPAY)
        // --------------------------------------------------------
        [HttpPost("create-order")]
        public async Task<IActionResult> CreateOrder([FromBody] CreatePlanOrderDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return Unauthorized();

            var plan = await _db.Pricings.FindAsync(dto.PlanId);
            if (plan == null) return BadRequest("Invalid plan");

            var billing = dto.BillingCycle.ToLowerInvariant();
            var intent = dto.Intent.ToLowerInvariant();

            var now = DateTimeHelper.GetIndianTime();
            var active = await _timeline.GetActiveAsync(user.Id, now);

            decimal grossPrice = billing == "annual" ? plan.AnnualPrice : plan.MonthlyPrice;
            decimal proration = 0m;
            decimal amountToCharge = grossPrice;

            // Immediate upgrade detection
            if (intent == "upgrade_immediate" && active != null && plan.TierOrder > active.Plan.TierOrder)
            {
                proration = _timeline.CalculateProrationCredit(active, now);
                amountToCharge = Math.Max(0m, grossPrice - proration);
            }
            else
            {
                intent = "purchase"; // fallback
            }

            // Create Razorpay order
            string key = _config["Razorpay:KeyId"];
            string secret = _config["Razorpay:KeySecret"];

            var client = _httpFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue(
                    "Basic",
                    Convert.ToBase64String(Encoding.UTF8.GetBytes($"{key}:{secret}"))
                );

            var payload = new
            {
                amount = Convert.ToInt32(amountToCharge * 100),
                currency = "INR",
                receipt = $"rcpt_{Guid.NewGuid():N}",
                notes = new
                {
                    planId = plan.Id,
                    billing,
                    intent,
                    proration
                }
            };

            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var resp = await client.PostAsync("https://api.razorpay.com/v1/orders", content);

            var respStr = await resp.Content.ReadAsStringAsync();
            if (!resp.IsSuccessStatusCode)
                return StatusCode(500, respStr);

            using var doc = JsonDocument.Parse(respStr);
            string orderId = doc.RootElement.GetProperty("id").GetString();

            // Save order
            var order = new RazorpayPlanOrder
            {
                OrderId = orderId,
                AppUserId = user.Id,
                PlanId = plan.Id,
                BillingCycle = billing,
                Intent = intent,
                ProrationCredit = proration,
                Amount = amountToCharge,
                Status = "created",
                CreatedAt = now
            };

            _db.RazorpayPlanOrders.Add(order);
            await _db.SaveChangesAsync();

            return Ok(new { orderId, amount = amountToCharge, currency = "INR", key });
        }

        // --------------------------------------------------------
        //  POST: VERIFY PAYMENT AND ACTIVATE SUBSCRIPTION
        // --------------------------------------------------------
        [HttpPost("verify")]
        public async Task<IActionResult> VerifyPayment([FromBody] VerifyPlanPaymentDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var order = await _db.RazorpayPlanOrders
                .FirstOrDefaultAsync(x => x.OrderId == dto.OrderId && x.AppUserId == userId);

            if (order == null) return NotFound("Invalid order");

            if (!VerifySignature(dto.OrderId, dto.PaymentId, dto.Signature, _config["Razorpay:KeySecret"]))
                return BadRequest("Invalid signature");

            order.Status = "paid";
            order.PaymentId = dto.PaymentId;
            order.PaidAt = DateTimeHelper.GetIndianTime();
            await _db.SaveChangesAsync();

            var plan = await _db.Pricings.FindAsync(order.PlanId);
            var user = await _userManager.FindByIdAsync(userId);

            // APPLY SUBSCRIPTION THROUGH NEW ENGINE
            var invoice = await _subscriptionService.ApplyPurchaseAsync(
                user,
                plan,
                order.BillingCycle,
                order.Amount,
                order.ProrationCredit,
                "razorpay",
                dto.PaymentId
            );

            return Ok(new
            {
                success = true,
                invoiceNumber = invoice.InvoiceNumber,
                start = invoice.PlanStartDate,
                end = invoice.PlanEndDate
            });
        }

        // --------------------------------------------------------
        private bool VerifySignature(string orderId, string paymentId, string signature, string secret)
        {
            var payload = $"{orderId}|{paymentId}";
            var key = Encoding.UTF8.GetBytes(secret);

            using var hmac = new System.Security.Cryptography.HMACSHA256(key);
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
            var expected = BitConverter.ToString(hash).Replace("-", "").ToLower();

            return expected == signature;
        }

        public class CreatePlanOrderDto
    {
        public int PlanId { get; set; }
        public string BillingCycle { get; set; } = "monthly"; 
        public string Intent { get; set; } = "purchase";
    }

    public class VerifyPlanPaymentDto
    {
        public string OrderId { get; set; }
        public string PaymentId { get; set; }
        public string Signature { get; set; }
    }
    }
}
