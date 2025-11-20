using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using minutechart.Data;
using minutechart.Models;

namespace minutechart.Services
{
    public class AddonInvoiceService
    {
        private readonly MinutechartDbContext _db;
        private readonly IEmailSender _emailSender;
        private readonly IWebHostEnvironment _env;

        public AddonInvoiceService(MinutechartDbContext db, IEmailSender emailSender, IWebHostEnvironment env)
        {
            _db = db;
            _emailSender = emailSender;
            _env = env;
        }

        // Generate PDF only
        public async Task<AddonInvoice> GenerateInvoiceAsync(AddonInvoice invoice, string fileName)
        {
            var company = await _db.CompanyInvoiceSettings
                .Include(c => c.Columns)
                .FirstOrDefaultAsync();

            if (company == null)
                throw new Exception("Company invoice settings not configured.");

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == invoice.AppUserId);
            if (user == null)
                throw new Exception("User not found.");

            // Fetch active plan so invoice can show plan details
            var activePlan = await _db.Pricings
                .FirstOrDefaultAsync(p => p.Id == invoice.PricingId);

            if (activePlan == null)
                throw new Exception("Pricing package not found for addon invoice.");

            // folder: /wwwroot/invoices/
            var invoiceDir = Path.Combine(_env.WebRootPath, "invoices");
            if (!Directory.Exists(invoiceDir))
                Directory.CreateDirectory(invoiceDir);

            // generate PDF
            var pdfBytes = DynamicAddonInvoicePdfGenerator.GeneratePdf(
                company, invoice, user, activePlan
            );

            var filePath = Path.Combine(invoiceDir, fileName);

            await File.WriteAllBytesAsync(filePath, pdfBytes);

            // store relative path for download
            invoice.PdfPath = $"/invoices/{fileName}";

            _db.AddonInvoices.Update(invoice);
            await _db.SaveChangesAsync();

            return invoice;
        }

        public async Task SendInvoiceEmailAsync(AddonInvoice invoice)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == invoice.AppUserId);
            if (user == null || string.IsNullOrEmpty(invoice.PdfPath))
                return;

            var originalPath = Path.Combine(_env.WebRootPath, invoice.PdfPath.TrimStart('/'));
            if (!File.Exists(originalPath))
                throw new Exception("Invoice PDF file not found for email attachment.");

            var userEmail = user.Email ?? "user@example.com";

            // Create a temp directory for clean filename
            var tempDir = Path.Combine(_env.WebRootPath, "temp");
            if (!Directory.Exists(tempDir))
                Directory.CreateDirectory(tempDir);

            // extract clean filename (remove folders)
            var cleanName = Path.GetFileName(originalPath);

            // temp file path which email sender will use
            var tempFilePath = Path.Combine(tempDir, cleanName);

            // copy original invoice to temp clean file (overwrite if needed)
            File.Copy(originalPath, tempFilePath, overwrite: true);

            var subject = $"Your Add-on Invoice #{invoice.InvoiceNumber}";

            var htmlContent = $@"
                <p>Hello,</p>
                <p>Your add-on purchase has been processed successfully.</p>
                <p><strong>Invoice No:</strong> {invoice.InvoiceNumber}</p>
                <p><strong>Amount:</strong> ₹{invoice.Amount:F2}</p>
                <p><strong>Validity:</strong> {invoice.StartDate:dd-MM-yyyy} to {invoice.EndDate:dd-MM-yyyy}</p>
                <p>Your invoice is attached.</p>
                <p>Regards,<br/>NGraph Team</p>
            ";

            // EMAIL WITH CLEAN FILE NAME
            await _emailSender.SendEmailAsync(
                toEmail: userEmail,
                subject: subject,
                plainTextContent: $"Your Add-on Invoice #{invoice.InvoiceNumber}",
                htmlContent: htmlContent,
                attachmentPath: tempFilePath
            );

            // cleanup: delete temp file
            try { File.Delete(tempFilePath); } catch { }
        }
    }
}