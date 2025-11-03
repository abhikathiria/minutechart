// // minutechart.Services/SendGridEmailSender.cs

// using SendGrid;
// using SendGrid.Helpers.Mail;
// using Microsoft.EntityFrameworkCore;
// using minutechart.Data;
// using System.IO;
// using Microsoft.Extensions.Configuration; // Required for accessing Environment Variables

// namespace minutechart.Services
// {
//     // Rename this class to reflect the new implementation
//     public class SendGridEmailSender : IEmailSender
//     {
//         private readonly MinutechartDbContext _db;
//         private readonly string _sendGridApiKey;

//         // Constructor now needs IConfiguration to get the API Key
//         public SendGridEmailSender(MinutechartDbContext db, IConfiguration configuration)
//         {
//             _db = db;
//             // Get the API Key from the environment variable set on Render
//             _sendGridApiKey = configuration["SENDGRID_API_KEY"] 
//                               ?? throw new Exception("SENDGRID_API_KEY environment variable is not set.");
//         }

//         public async Task SendEmailAsync(string toEmail, string subject, string plainTextContent, string htmlContent, string attachmentPath = null)
//         {
//             // 1. Retrieve essential settings (especially FromEmail) from DB
//             var settings = await _db.EmailSettings.FirstOrDefaultAsync();
//             if (settings == null)
//                 throw new Exception("Email settings not configured in the database.");

//             // 2. Initialize SendGrid Client
//             var client = new SendGridClient(_sendGridApiKey);
            
//             // 3. Construct the Message
//             var from = new EmailAddress(settings.FromEmail, "Ngraph Support");
//             var to = new EmailAddress(toEmail);
//             var msg = MailHelper.CreateSingleEmail(from, to, subject, plainTextContent, htmlContent);

//             // 4. Handle Attachment (SendGrid requires Base64 string)
//             if (!string.IsNullOrEmpty(attachmentPath) && File.Exists(attachmentPath))
//             {
//                 var bytes = await File.ReadAllBytesAsync(attachmentPath);
//                 var fileContent = Convert.ToBase64String(bytes);
//                 msg.AddAttachment(Path.GetFileName(attachmentPath), fileContent);
//             }

//             // 5. Send the Email
//             var response = await client.SendEmailAsync(msg);
            
//             // Optional: Check for success/failure
//             if (!response.IsSuccessStatusCode)
//             {
//                 // This is a crucial step for debugging on Render!
//                 var body = await response.Body.ReadAsStringAsync();
//                 throw new Exception($"SendGrid email failed. Status Code: {response.StatusCode}. Body: {body}");
//             }
//         }
        
//         // The Decrypt method is no longer needed since the API key is used directly.
//     }
// }