using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using minutechart.Data;
using minutechart.Models;

namespace minutechart.Services
{
    public class PlanInvoiceService
    {
        private readonly MinutechartDbContext _db;
        private readonly IEmailSender _emailSender;
        private readonly IWebHostEnvironment _env;

        public PlanInvoiceService(MinutechartDbContext db, IEmailSender emailSender, IWebHostEnvironment env)
        {
            _db = db;
            _emailSender = emailSender;
            _env = env;
        }

        // Generate PDF only
        public async Task<PlanInvoice> GenerateInvoiceAsync(PlanInvoice invoice, string fileName)
        {
            var companySettings = await _db.CompanyInvoiceSettings
                .Include(c => c.Columns)
                .FirstOrDefaultAsync();

            if (companySettings == null)
                throw new Exception("Company invoice settings not configured.");

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == invoice.AppUserId);
            if (user == null)
                throw new Exception("User not found.");

            var invoiceDir = Path.Combine(_env.WebRootPath, "invoices");
            if (!Directory.Exists(invoiceDir))
                Directory.CreateDirectory(invoiceDir);

            var pdfBytes = DynamicPlanInvoicePdfGenerator.GeneratePdf(companySettings, invoice, user);

            var filePath = Path.Combine(invoiceDir, fileName);
            await File.WriteAllBytesAsync(filePath, pdfBytes);

            invoice.PdfPath = $"/invoices/{fileName}";

            _db.PlanInvoices.Update(invoice);
            await _db.SaveChangesAsync();

            return invoice;
        }

        public async Task SendInvoiceEmailAsync(PlanInvoice invoice)
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

            var subject = $"Your Invoice #{invoice.InvoiceNumber}";
            var htmlContent = $@"
                <p>Hello,</p>
                <p>Thank you for your payment. Your invoice #{invoice.InvoiceNumber} is attached.</p>
                <p>Amount: ₹{invoice.NetAmount:F2}</p>
                <p>Regards,<br/>NGraph Team</p>
            ";

            // EMAIL WITH CLEAN FILE NAME
            await _emailSender.SendEmailAsync(
                toEmail: userEmail,
                subject: subject,
                plainTextContent: $"Invoice #{invoice.InvoiceNumber} - Amount ₹{invoice.NetAmount:F2}",
                htmlContent: htmlContent,
                attachmentPath: tempFilePath
            );

            // cleanup: delete temp file
            try { File.Delete(tempFilePath); } catch { }
        }
    }
}