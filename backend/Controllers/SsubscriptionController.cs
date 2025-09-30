// using Microsoft.AspNetCore.Authorization;
// using Microsoft.EntityFrameworkCore;
// using Microsoft.AspNetCore.Identity;
// using Microsoft.AspNetCore.Mvc;
// using minutechart.Models;
// using minutechart.Data;
// using minutechart.Helpers;
// using System.Security.Claims;
// using System.Net.Http.Headers;
// using System.Text;
// using System.Text.Json;
// using System.Security.Cryptography;
// using iTextSharp.text;
// using iTextSharp.text.pdf;
// using System.IO;


// namespace minutechart.Controllers.Api
// {
//     [ApiController]
//     [Route("api/[controller]")]
//     [Authorize]
//     public class SubscriptionController : ControllerBase
//     {
//         private readonly MinutechartDbContext _db;
//         private readonly UserManager<AppUser> _userManager;
//         private readonly IConfiguration _config;
//         private readonly IHttpClientFactory _httpFactory;

//         public SubscriptionController(
//             MinutechartDbContext db,
//             UserManager<AppUser> userManager,
//             IConfiguration config,
//             IHttpClientFactory httpFactory)
//         {
//             _db = db;
//             _userManager = userManager;
//             _config = config;
//             _httpFactory = httpFactory;
//         }

//         // POST /subscription/create-order
//         [HttpPost("create-order")]
//         public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto dto)
//         {
//             var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
//             if (string.IsNullOrEmpty(userId)) return Unauthorized();

//             var user = await _userManager.FindByIdAsync(userId);
//             if (user == null) return Unauthorized();

//             var plan = await _db.SubscriptionPlans.FindAsync(dto.PlanId);
//             if (plan == null) return NotFound("Plan not found");

//             // amount in paise
//             var amountPaise = Convert.ToInt32(plan.Price * 100M);

//             var keyId = _config["Razorpay:KeyId"];
//             var keySecret = _config["Razorpay:KeySecret"];
//             if (string.IsNullOrEmpty(keyId) || string.IsNullOrEmpty(keySecret))
//                 return StatusCode(500, "Razorpay not configured");

//             // create order via Razorpay Orders API
//             var client = _httpFactory.CreateClient();
//             var basicAuth = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{keyId}:{keySecret}"));
//             client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", basicAuth);

//             var payload = new
//             {
//                 amount = amountPaise,
//                 currency = "INR",
//                 receipt = $"rcpt_{Guid.NewGuid():N}",
//                 notes = new { planId = plan.Id.ToString(), userId = user.Id }
//             };

//             var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
//             var resp = await client.PostAsync("https://api.razorpay.com/v1/orders", content);
//             var respString = await resp.Content.ReadAsStringAsync();

//             if (!resp.IsSuccessStatusCode)
//             {
//                 // include response for easier debugging in dev
//                 return StatusCode(500, $"Failed to create order: {respString}");
//             }

//             using var doc = JsonDocument.Parse(respString);
//             var orderId = doc.RootElement.GetProperty("id").GetString()!;
//             var orderAmountPaise = doc.RootElement.GetProperty("amount").GetInt32();
//             var orderAmountRupees = orderAmountPaise / 100.0M;

//             // persist mapping to DB
//             var payOrder = new RazorpayOrder
//             {
//                 OrderId = orderId,
//                 AppUserId = user.Id,
//                 PlanId = plan.Id,
//                 Amount = orderAmountRupees,
//                 Status = "created",
//                 CreatedAt = DateTimeHelper.GetIndianTime()
//             };
//             _db.RazorpayOrders.Add(payOrder);
//             await _db.SaveChangesAsync();

//             return Ok(new
//             {
//                 orderId,
//                 amount = orderAmountRupees,
//                 currency = "INR",
//                 key = keyId // public key - safe to send to client
//             });
//         }

//         // POST /subscription/verify
//         [HttpPost("verify")]
//         public async Task<IActionResult> VerifyPayment([FromBody] VerifyPaymentDto dto)
//         {
//             var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
//             if (string.IsNullOrEmpty(userId)) return Unauthorized();

//             var orderRecord = await _db.RazorpayOrders
//                 .Include(o => o.Plan) // Include plan to get duration
//                 .FirstOrDefaultAsync(o => o.OrderId == dto.OrderId && o.AppUserId == userId);

//             if (orderRecord == null) return NotFound("Order record not found");

//             var keySecret = _config["Razorpay:KeySecret"];
//             if (!VerifySignature(dto.OrderId, dto.PaymentId, dto.Signature, keySecret))
//                 return BadRequest("Invalid signature");

//             // Mark order as paid
//             orderRecord.PaymentId = dto.PaymentId;
//             orderRecord.Status = "paid";
//             orderRecord.PaidAt = DateTimeHelper.GetIndianTime();
//             await _db.SaveChangesAsync();

//             // Fetch plan details
//             var plan = orderRecord.Plan;
//             if (plan == null) return NotFound("Plan not found");

//             var now = DateTimeHelper.GetIndianTime();

//             // Determine start date for the new plan
//             var lastSubscriptionEnd = await _db.RazorpayOrders
//                 .Where(o => o.AppUserId == userId && o.Status == "paid" && o.PaidAt.HasValue)
//                 .OrderByDescending(o => o.PaidAt.Value.AddDays(o.Plan.DurationDays))
//                 .Select(o => o.PaidAt.Value.AddDays(o.Plan.DurationDays))
//                 .FirstOrDefaultAsync();

//             DateTime startDate = (lastSubscriptionEnd > now) ? lastSubscriptionEnd.AddSeconds(1) : now;
//             DateTime endDate = startDate.AddDays(plan.DurationDays);

//             // Optionally update AppUser fields
//             var userToUpdate = await _userManager.FindByIdAsync(userId);
//             userToUpdate.SubscriptionStartDate = userToUpdate.SubscriptionStartDate.HasValue
//                 ? userToUpdate.SubscriptionStartDate
//                 : startDate;
//             userToUpdate.SubscriptionEndDate = endDate; // latest end date
//             await _userManager.UpdateAsync(userToUpdate);

//             // ----------------------------
//             // CREATE INVOICE RECORD
//             // ----------------------------
//             var invoice = new Invoice
//             {
//                 UserId = userId,
//                 PlanId = plan.Id,
//                 RazorpayOrderId = orderRecord.OrderId,
//                 RazorpayPaymentId = orderRecord.PaymentId,
//                 PaymentDate = orderRecord.PaidAt.Value,
//                 Amount = orderRecord.Amount,
//                 Currency = "INR",
//                 InvoiceNumber = $"INV-{DateTimeHelper.GetIndianTime():yyyyMMdd}-{orderRecord.Id}",
//                 Status = "Paid"
//             };
//             _db.Invoices.Add(invoice);
//             await _db.SaveChangesAsync();
//             // ----------------------------

//             return Ok(new
//             {
//                 success = true,
//                 subscriptionStart = startDate,
//                 subscriptionEnd = endDate,
//                 invoiceId = invoice.Id,
//                 invoiceNumber = invoice.InvoiceNumber
//             });
//         }

//         [HttpGet("invoice/{invoiceId}")]
//         public async Task<IActionResult> DownloadInvoicePdf(int invoiceId)
//         {
//             var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
//             if (string.IsNullOrEmpty(userId))
//                 return Unauthorized();

//             // Fetch invoice with plan info and user info
//             var invoice = await _db.Invoices
//                 .Include(i => i.Plan)
//                 .FirstOrDefaultAsync(i => i.Id == invoiceId && i.UserId == userId);

//             if (invoice == null)
//                 return NotFound("Invoice not found");

//             var user = await _userManager.FindByIdAsync(invoice.UserId);

//             using var ms = new MemoryStream();
//             var document = new Document(PageSize.A4, 36, 36, 54, 36);
//             PdfWriter.GetInstance(document, ms);
//             document.Open();

//             // Load custom font
//             string fontPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "public", "NotoSans-Regular.ttf");
//             BaseFont baseFont = BaseFont.CreateFont(fontPath, BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
//             Font unicode = new Font(baseFont, 10, Font.NORMAL, new BaseColor(15, 23, 42)); // #0F172A
//             Font unicodeBold = new Font(baseFont, 10, Font.BOLD, new BaseColor(15, 23, 42));
//             Font unicodeHeader = new Font(baseFont, 12, Font.BOLD, BaseColor.WHITE);
//             Font unicodeTitle = new Font(baseFont, 16, Font.BOLD, new BaseColor(250, 204, 21)); // gold (#FACC15)

//             // --- HEADER SECTION ---
//             PdfPTable headerTable = new PdfPTable(2) { WidthPercentage = 100 };
//             headerTable.SetWidths(new float[] { 70f, 30f });

//             // Left header content
//             PdfPCell leftHeader = new PdfPCell
//             {
//                 Border = Rectangle.NO_BORDER,
//                 BackgroundColor = new BaseColor(15, 23, 42), // #0F172A
//                 Padding = 10
//             };
//             leftHeader.AddElement(new Phrase("New Tech Infosol", new Font(baseFont, 12, Font.BOLD, new BaseColor(250, 204, 21))));
//             leftHeader.AddElement(new Phrase("📞 +91-261-2979903", unicode));
//             leftHeader.AddElement(new Phrase("✉ info@newtechinfosol.in", unicode));
//             leftHeader.AddElement(new Phrase("📍 A-801, Swastik Universsal Business Hub, Beside Valentine Multiples, Piplod Dumas Road, Surat-395007", unicode));

//             // Right header content
//             PdfPCell rightHeader = new PdfPCell(new Phrase("INVOICE", new Font(baseFont, 20, Font.BOLD, BaseColor.WHITE)))
//             {
//                 Border = Rectangle.NO_BORDER,
//                 BackgroundColor = new BaseColor(250, 204, 21), // Gold
//                 HorizontalAlignment = Element.ALIGN_CENTER,
//                 VerticalAlignment = Element.ALIGN_MIDDLE
//             };

//             headerTable.AddCell(leftHeader);
//             headerTable.AddCell(rightHeader);
//             document.Add(headerTable);
//             document.Add(new Paragraph("\n"));

//             // --- INVOICE TO SECTION ---
//             PdfPTable invoiceTo = new PdfPTable(2) { WidthPercentage = 100 };
//             invoiceTo.SetWidths(new float[] { 60f, 40f });

//             PdfPCell left = new PdfPCell { Border = Rectangle.NO_BORDER };
//             left.AddElement(new Phrase("INVOICE TO:", unicodeBold));
//             left.AddElement(new Phrase($"{user.CustomerName}", new Font(baseFont, 12, Font.BOLD, new BaseColor(15, 23, 42))));
//             left.AddElement(new Phrase($"Company: {user.CompanyName}", unicode));
//             left.AddElement(new Phrase($"Phone: {user.PhoneNumber}", unicode));

//             PdfPCell right = new PdfPCell { Border = Rectangle.NO_BORDER };
//             right.AddElement(new Phrase($"INVOICE NO: #{invoice.InvoiceNumber}", unicodeBold));
//             right.AddElement(new Phrase($"Invoice Date: {invoice.PaymentDate:dd/MM/yyyy}", unicode));

//             invoiceTo.AddCell(left);
//             invoiceTo.AddCell(right);
//             document.Add(invoiceTo);
//             document.Add(new Paragraph("\n"));

//             // --- ITEM TABLE ---
//             PdfPTable table = new PdfPTable(4) { WidthPercentage = 100 };
//             table.SetWidths(new float[] { 1f, 4f, 2f, 2f });

//             AddHeaderCell(table, "SL NO", unicodeHeader);
//             AddHeaderCell(table, "SUBSCRIPTION PLAN NAME", unicodeHeader);
//             AddHeaderCell(table, "PRICE", unicodeHeader);
//             AddHeaderCell(table, "TOTAL", unicodeHeader);

//             // Only one plan per invoice
//             table.AddCell(CreateCell("1", unicode));
//             table.AddCell(CreateCell(invoice.Plan.Name, unicode));
//             table.AddCell(CreateCell($"${invoice.Amount:0.00}", unicode));
//             table.AddCell(CreateCell($"${invoice.Amount:0.00}", unicode));

//             document.Add(table);

//             // --- SUMMARY SECTION ---
//             PdfPTable summary = new PdfPTable(2) { WidthPercentage = 40, HorizontalAlignment = Element.ALIGN_RIGHT };
//             summary.SetWidths(new float[] { 2f, 1f });

//             summary.AddCell(CreateCell("GRAND TOTAL", unicodeBold));
//             summary.AddCell(CreateCell($"${invoice.Amount:0.00}", unicode));

//             document.Add(summary);
//             document.Add(new Paragraph("\n"));

//             // --- FOOTER ---
//             var thankYou = new Paragraph("THANK YOU FOR YOUR BUSINESS WITH US!", unicodeBold) { Alignment = Element.ALIGN_CENTER };
//             document.Add(thankYou);

//             document.Add(new Paragraph("\n"));
//             var terms = new Paragraph("Terms & Conditions:\nOnce the subscription is activated you cannot deactivate it. We look forward to future projects!", unicode);
//             document.Add(terms);

//             document.Add(new Paragraph("\n\n"));
//             document.Add(new Paragraph("__________________________", unicode));
//             document.Add(new Paragraph("Signature", unicode));

//             // --- LOGO SECTION ---
//             PdfPTable logoSection = new PdfPTable(1) { WidthPercentage = 100 };
//             PdfPCell logoCell = new PdfPCell
//             {
//                 Border = Rectangle.NO_BORDER,
//                 BackgroundColor = new BaseColor(15, 23, 42), // #0F172A
//                 HorizontalAlignment = Element.ALIGN_CENTER,
//                 Padding = 20
//             };

//             // Add logo if available
//             string logoPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "public", "minutechartlogo.png");
//             if (System.IO.File.Exists(logoPath))
//             {
//                 var logo = iTextSharp.text.Image.GetInstance(logoPath);
//                 logo.ScaleToFit(80f, 80f);
//                 logo.Alignment = Element.ALIGN_CENTER;
//                 logoCell.AddElement(logo);
//             }

//             logoSection.AddCell(logoCell);
//             document.Add(logoSection);

//             document.Close();
//             return File(ms.ToArray(), "application/pdf", $"Invoice_{invoice.InvoiceNumber}.pdf");
//         }

//         private static PdfPCell CreateCell(string text, Font font)
//         {
//             return new PdfPCell(new Phrase(text, font))
//             {
//                 Padding = 5,
//                 Border = Rectangle.BOX
//             };
//         }

//         private static void AddHeaderCell(PdfPTable table, string text, Font font)
//         {
//             var cell = new PdfPCell(new Phrase(text, font))
//             {
//                 BackgroundColor = new BaseColor(15, 23, 42), // #0F172A
//                 HorizontalAlignment = Element.ALIGN_CENTER,
//                 Padding = 5
//             };
//             table.AddCell(cell);
//         }

//         private bool VerifySignature(string orderId, string paymentId, string signature, string secret)
//         {
//             // Razorpay signature is hex lowercase of HMAC_SHA256(orderId + "|" + paymentId)
//             var payload = $"{orderId}|{paymentId}";
//             var key = Encoding.UTF8.GetBytes(secret);
//             using var hmac = new HMACSHA256(key);
//             var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
//             var expected = BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
//             return expected == signature;
//         }

//         private bool UserHasActiveSubscription(AppUser user)
//         {
//             var now = DateTimeHelper.GetIndianTime();
//             return user != null && user.SubscriptionEndDate.HasValue && user.SubscriptionEndDate.Value >= now;
//         }

//     }


//     // DTOs
//     public class CreateOrderDto
//     {
//         public int PlanId { get; set; }
//     }

//     public class VerifyPaymentDto
//     {
//         public string OrderId { get; set; } = null!;
//         public string PaymentId { get; set; } = null!;
//         public string Signature { get; set; } = null!;
//     }
// }