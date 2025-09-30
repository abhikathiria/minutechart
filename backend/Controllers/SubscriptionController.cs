// SubscriptionController.cs
using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Security.Claims;
using System.Security.Cryptography;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;

using PuppeteerSharp; // PuppeteerSharp
using iTextSharp.text;
using iTextSharp.text.pdf;

using minutechart.Models;
using minutechart.Data;
using minutechart.Services;
using minutechart.Helpers;
using System.Net.Http.Headers;
using PuppeteerSharp.Media;

namespace minutechart.Controllers.Api
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SubscriptionController : ControllerBase
    {
        private readonly MinutechartDbContext _db;
        private readonly UserManager<AppUser> _userManager;
        private readonly IConfiguration _config;
        private readonly IHttpClientFactory _httpFactory;

        public SubscriptionController(
            MinutechartDbContext db,
            UserManager<AppUser> userManager,
            IConfiguration config,
            IHttpClientFactory httpFactory)
        {
            _db = db;
            _userManager = userManager;
            _config = config;
            _httpFactory = httpFactory;
        }

        // your existing create-order & verify code (unchanged)...
        // POST /subscription/create-order
        [HttpPost("create-order")]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return Unauthorized();

            var plan = await _db.SubscriptionPlans.FindAsync(dto.PlanId);
            if (plan == null) return NotFound("Plan not found");

            // amount in paise
            var amountPaise = Convert.ToInt32(plan.Price * 100M);

            var keyId = _config["Razorpay:KeyId"];
            var keySecret = _config["Razorpay:KeySecret"];
            if (string.IsNullOrEmpty(keyId) || string.IsNullOrEmpty(keySecret))
                return StatusCode(500, "Razorpay not configured");

            // create order via Razorpay Orders API
            var client = _httpFactory.CreateClient();
            var basicAuth = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{keyId}:{keySecret}"));
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", basicAuth);

            var payload = new
            {
                amount = amountPaise,
                currency = "INR",
                receipt = $"rcpt_{Guid.NewGuid():N}",
                notes = new { planId = plan.Id.ToString(), userId = user.Id }
            };

            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var resp = await client.PostAsync("https://api.razorpay.com/v1/orders", content);
            var respString = await resp.Content.ReadAsStringAsync();

            if (!resp.IsSuccessStatusCode)
            {
                // include response for easier debugging in dev
                return StatusCode(500, $"Failed to create order: {respString}");
            }

            using var doc = JsonDocument.Parse(respString);
            var orderId = doc.RootElement.GetProperty("id").GetString()!;
            var orderAmountPaise = doc.RootElement.GetProperty("amount").GetInt32();
            var orderAmountRupees = orderAmountPaise / 100.0M;

            // persist mapping to DB
            var payOrder = new RazorpayOrder
            {
                OrderId = orderId,
                AppUserId = user.Id,
                PlanId = plan.Id,
                Amount = orderAmountRupees,
                Status = "created",
                CreatedAt = DateTimeHelper.GetIndianTime()
            };
            _db.RazorpayOrders.Add(payOrder);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                orderId,
                amount = orderAmountRupees,
                currency = "INR",
                key = keyId // public key - safe to send to client
            });
        }

        [HttpPost("verify")]
        public async Task<IActionResult> VerifyPayment([FromBody] VerifyPaymentDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var orderRecord = await _db.RazorpayOrders
                .Include(o => o.Plan)
                .FirstOrDefaultAsync(o => o.OrderId == dto.OrderId && o.AppUserId == userId);

            if (orderRecord == null) return NotFound("Order record not found");

            var keySecret = _config["Razorpay:KeySecret"];
            if (!VerifySignature(dto.OrderId, dto.PaymentId, dto.Signature, keySecret))
                return BadRequest("Invalid signature");

            // Mark order as paid
            orderRecord.PaymentId = dto.PaymentId;
            orderRecord.Status = "paid";
            orderRecord.PaidAt = DateTimeHelper.GetIndianTime();
            await _db.SaveChangesAsync();

            // Fetch plan details
            var plan = await _db.SubscriptionPlans.FindAsync(orderRecord.PlanId);
            if (plan == null) return NotFound("Plan not found");

            var now = DateTimeHelper.GetIndianTime();
            var user = await _userManager.FindByIdAsync(userId);

            // DateTime startDate;
            // DateTime endDate;

            // // ✅ CASE 1: Trial is active → schedule after trial ends
            // if (user.TrialEndDate.HasValue && user.TrialEndDate.Value > now)
            // {
            //     startDate = user.TrialEndDate.Value.AddSeconds(1);
            //     endDate = startDate.AddDays(plan.DurationDays);

            //     // Only set if no active subscription yet
            //     if (!user.SubscriptionStartDate.HasValue || user.SubscriptionEndDate <= now)
            //     {
            //         user.SubscriptionStartDate = startDate;
            //         user.SubscriptionEndDate = endDate;
            //     }
            //     else
            //     {
            //         // If there’s already an upcoming plan, extend its end date
            //         user.SubscriptionEndDate = user.SubscriptionEndDate.Value.AddDays(plan.DurationDays);
            //         endDate = user.SubscriptionEndDate.Value;
            //         startDate = user.SubscriptionStartDate.Value;
            //     }
            // }
            // // ✅ CASE 2: Already has active subscription → extend
            // else if (user.SubscriptionEndDate.HasValue && user.SubscriptionEndDate.Value > now)
            // {
            //     startDate = user.SubscriptionStartDate.Value;
            //     user.SubscriptionEndDate = user.SubscriptionEndDate.Value.AddDays(plan.DurationDays);
            //     endDate = user.SubscriptionEndDate.Value;
            // }
            // // ✅ CASE 3: No trial or subscription → start now
            // else
            // {
            //     startDate = now;
            //     endDate = now.AddDays(plan.DurationDays);
            //     user.SubscriptionStartDate = startDate;
            //     user.SubscriptionEndDate = endDate;
            // }

            // await _userManager.UpdateAsync(user);

            // var invoice = new Invoice
            // {
            //     UserId = userId,
            //     PlanId = plan.Id,
            //     Plan = plan,
            //     RazorpayOrderId = orderRecord.OrderId,
            //     RazorpayPaymentId = dto.PaymentId,
            //     PaymentDate = now,
            //     Amount = orderRecord.Amount,
            //     Currency = "INR",
            //     InvoiceNumber = "TEMP",
            //     PlanStartDate = startDate,
            //     PlanEndDate = endDate
            // };

            // // Save to DB
            // _db.Invoices.Add(invoice);
            // await _db.SaveChangesAsync();

            // Determine start/end for the invoice based on trial & existing subscription
            DateTime plannedStartDate;
            DateTime plannedEndDate;

            // CASE 1: Trial active
            if (user.TrialEndDate.HasValue && user.TrialEndDate.Value > now)
            {
                plannedStartDate = user.SubscriptionEndDate.HasValue && user.SubscriptionEndDate > now
                                    ? user.SubscriptionEndDate.Value.AddSeconds(1)
                                    : user.TrialEndDate.Value.AddSeconds(1);

                plannedEndDate = plannedStartDate.AddDays(plan.DurationDays);

                // Update user subscription if no active plan
                if (!user.SubscriptionStartDate.HasValue || user.SubscriptionEndDate <= now)
                {
                    user.SubscriptionStartDate = plannedStartDate;
                    user.SubscriptionEndDate = plannedEndDate;
                }
                else
                {
                    user.SubscriptionEndDate = plannedEndDate;
                }
            }
            // CASE 2: Active subscription exists
            else if (user.SubscriptionEndDate.HasValue && user.SubscriptionEndDate.Value > now)
            {
                plannedStartDate = user.SubscriptionEndDate.Value.AddSeconds(1);
                plannedEndDate = plannedStartDate.AddDays(plan.DurationDays);

                // extend user's end date
                user.SubscriptionEndDate = plannedEndDate;
            }
            // CASE 3: No trial & no subscription
            else
            {
                plannedStartDate = now;
                plannedEndDate = now.AddDays(plan.DurationDays);
                user.SubscriptionStartDate = plannedStartDate;
                user.SubscriptionEndDate = plannedEndDate;
            }

            // Save user subscription dates
            await _userManager.UpdateAsync(user);

            // Create invoice with the correct scheduled dates
            var invoice = new Invoice
            {
                UserId = userId,
                PlanId = plan.Id,
                Plan = plan,
                RazorpayOrderId = orderRecord.OrderId,
                RazorpayPaymentId = dto.PaymentId,
                PaymentDate = now,
                Amount = orderRecord.Amount,
                Currency = "INR",
                InvoiceNumber = "TEMP",
                PlanStartDate = plannedStartDate,
                PlanEndDate = plannedEndDate
            };

            _db.Invoices.Add(invoice);
            await _db.SaveChangesAsync();


            invoice.InvoiceNumber = $"INV-{invoice.Id}";

            var datePart = now.ToString("ddMMMyyyy"); // e.g. 19Sep2025
            var timePart = now.ToString("hhmmtt");    // e.g. 0309PM
            var fileName = $"INVOICE_{invoice.Id}_{datePart}_{timePart}.pdf";

            invoice.PdfPath = Path.Combine("invoices", fileName);

            // Generate PDF and send email
            var invoiceService = new InvoiceService(_db, HttpContext.RequestServices.GetRequiredService<IEmailSender>(), HttpContext.RequestServices.GetRequiredService<IWebHostEnvironment>());
            invoice = await invoiceService.GenerateAndSendInvoiceAsync(invoice, fileName);

            await _db.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                subscriptionStart = plannedStartDate,
                subscriptionEnd = plannedEndDate,
                invoiceNumber = invoice.InvoiceNumber,
                invoicePdf = invoice.PdfPath
            });
        }

        [HttpGet("download-invoice/{orderId}")]
        public async Task<IActionResult> DownloadInvoice(string orderId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            // Fetch the invoice associated with this order
            var invoice = await _db.Invoices
                .Include(i => i.Plan)
                .FirstOrDefaultAsync(i => i.RazorpayOrderId == orderId && i.UserId == userId);

            if (invoice == null || string.IsNullOrEmpty(invoice.PdfPath))
                return NotFound();

            // Full path on the server
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", invoice.PdfPath.TrimStart('/'));

            if (!System.IO.File.Exists(filePath))
                return NotFound();

            var bytes = await System.IO.File.ReadAllBytesAsync(filePath);
            var fileName = Path.GetFileName(invoice.PdfPath);
            return File(bytes, "application/pdf", fileName);
        }

        private bool VerifySignature(string orderId, string paymentId, string signature, string secret)
        {
            // Razorpay signature is hex lowercase of HMAC_SHA256(orderId + "|" + paymentId)
            var payload = $"{orderId}|{paymentId}";
            var key = Encoding.UTF8.GetBytes(secret);
            using var hmac = new HMACSHA256(key);
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
            var expected = BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
            return expected == signature;
        }

        private bool UserHasActiveSubscription(AppUser user)
        {
            var now = DateTimeHelper.GetIndianTime();
            return user != null && user.SubscriptionEndDate.HasValue && user.SubscriptionEndDate.Value >= now;
        }
    }

    // DTOs kept at bottom
    public class CreateOrderDto
    {
        public int PlanId { get; set; }
    }

    public class VerifyPaymentDto
    {
        public string OrderId { get; set; } = null!;
        public string PaymentId { get; set; } = null!;
        public string Signature { get; set; } = null!;
    }
}
