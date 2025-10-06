using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using minutechart.Data;
using minutechart.Models;

namespace minutechart.Services
{
    public class InvoiceService
    {
        private readonly MinutechartDbContext _db;
        private readonly IEmailSender _emailSender;
        private readonly IWebHostEnvironment _env;

        public InvoiceService(MinutechartDbContext db, IEmailSender emailSender, IWebHostEnvironment env)
        {
            _db = db;
            _emailSender = emailSender;
            _env = env;
        }

        public async Task<Invoice> GenerateAndSendInvoiceAsync(Invoice invoice, string fileName)
        {
            // Load company invoice settings
            var companySettings = await _db.CompanyInvoiceSettings
                .Include(c => c.Columns)
                .FirstOrDefaultAsync();

            if (companySettings == null)
                throw new Exception("Company invoice settings not configured.");

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == invoice.AppUserId);
            if (user == null)
                throw new Exception("User not found for invoice.");

            // Ensure invoice folder exists
            var invoiceDir = Path.Combine(_env.WebRootPath, "invoices");
            if (!Directory.Exists(invoiceDir))
                Directory.CreateDirectory(invoiceDir);

            // Generate PDF using iText
            var pdfBytes = DynamicInvoicePdfGenerator.GeneratePdf(companySettings, invoice, user);
            
            var filePath = Path.Combine(invoiceDir, fileName);
            await File.WriteAllBytesAsync(filePath, pdfBytes);

            // Update invoice record
            invoice.PdfPath = $"/invoices/{fileName}";
            // _db.Invoices.Add(invoice);
            // await _db.SaveChangesAsync();

            // Fetch user email safely
            var userEmail = user?.Email ?? "user@example.com";

            // Send email with attachment
            var subject = $"Your Invoice #{invoice.InvoiceNumber}";
            var htmlContent = $@"
                <p>Hello,</p>
                <p>Thank you for your payment. Your invoice #{invoice.InvoiceNumber} is attached.</p>
                <p>Amount: ₹{invoice.Amount:F2}</p>
                <p>Regards,<br/>Minutechart Team</p>
            ";

            await _emailSender.SendEmailAsync(
                toEmail: userEmail,
                subject: subject,
                plainTextContent: $"Invoice #{invoice.InvoiceNumber} - Amount ₹{invoice.Amount:F2}",
                htmlContent: htmlContent,
                attachmentPath: filePath // attach PDF
            );

            return invoice;
        }
    }
}
