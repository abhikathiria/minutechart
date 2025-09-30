using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using Microsoft.EntityFrameworkCore;
using minutechart.Data;

namespace minutechart.Services
{
    public class MailKitEmailSender : IEmailSender
    {
        private readonly MinutechartDbContext _db;

        public MailKitEmailSender(MinutechartDbContext db)
        {
            _db = db;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string plainTextContent, string htmlContent, string attachmentPath = null)
        {
            var settings = await _db.EmailSettings.FirstOrDefaultAsync();
            if (settings == null)
                throw new Exception("Email settings not configured in the database.");

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("Minutechart Support", settings.FromEmail));
            message.To.Add(new MailboxAddress("", toEmail));
            message.Subject = subject;

            var bodyBuilder = new BodyBuilder
            {
                TextBody = plainTextContent,
                HtmlBody = htmlContent
            };

            // Add attachment if provided
            if (!string.IsNullOrEmpty(attachmentPath) && File.Exists(attachmentPath))
            {
                bodyBuilder.Attachments.Add(attachmentPath);
            }

            message.Body = bodyBuilder.ToMessageBody();

            using (var client = new SmtpClient())
            {
                await client.ConnectAsync(
                    settings.SmtpHost,
                    settings.SmtpPort,
                    settings.EnableSsl ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto
                );

                await client.AuthenticateAsync(settings.SmtpUser, Decrypt(settings.SmtpPassword));
                await client.SendAsync(message);
                await client.DisconnectAsync(true);
            }
        }

        private string Decrypt(string input)
        {
            var bytes = Convert.FromBase64String(input);
            return System.Text.Encoding.UTF8.GetString(bytes);
        }
    }
}
