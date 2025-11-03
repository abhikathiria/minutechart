// // minutechart.Services/MailjetEmailSender.cs

// using Mailjet.Client;
// using Mailjet.Client.Resources;
// using Newtonsoft.Json.Linq;
// using Microsoft.EntityFrameworkCore;
// using minutechart.Data;
// using Microsoft.Extensions.Configuration;
// using System.IO;

// // You will likely need this using statement if you use the GetMimeType helper
// using Microsoft.AspNetCore.StaticFiles; 

// namespace minutechart.Services
// {
//     // The C# class implementing the IEmailSender interface
//     public class MailjetEmailSender : IEmailSender
//     {
//         private readonly MinutechartDbContext _db;
//         private readonly MailjetClient _client;

//         public MailjetEmailSender(MinutechartDbContext db, IConfiguration configuration)
//         {
//             _db = db;
            
//             // 1. Retrieve the two API keys from IConfiguration
//             var publicKey = configuration["MAILJET_PUBLIC_KEY"] 
//                             ?? throw new Exception("MAILJET_PUBLIC_KEY environment variable is not set.");
//             var secretKey = configuration["MAILJET_SECRET_KEY"] 
//                             ?? throw new Exception("MAILJET_SECRET_KEY environment variable is not set.");

//             // 2. Initialize the Mailjet Client with both keys. 
//             // FIX: Use the simple two-argument constructor to avoid the overload conflict.
//             _client = new MailjetClient(publicKey, secretKey);
//         }

//         public async Task SendEmailAsync(string toEmail, string subject, string plainTextContent, string htmlContent, string attachmentPath = null)
//         {
//             var settings = await _db.EmailSettings.FirstOrDefaultAsync();
//             if (settings == null)
//                 throw new Exception("Email settings not configured in the database.");

//             // Mailjet uses JObject for the request body (API v3.1)
//             JObject emailBody = new JObject
//             {
//                 ["Messages"] = new JArray
//                 {
//                     new JObject
//                     {
//                         ["From"] = new JObject
//                         {
//                             ["Email"] = settings.FromEmail, // From DB setting
//                             ["Name"] = "Ngraph Support"
//                         },
//                         ["To"] = new JArray
//                         {
//                             new JObject { ["Email"] = toEmail }
//                         },
//                         ["Subject"] = subject,
//                         ["TextPart"] = plainTextContent,
//                         ["HTMLPart"] = htmlContent,
//                     }
//                 }
//             };

//             // 3. Handle Attachment
//             if (!string.IsNullOrEmpty(attachmentPath) && File.Exists(attachmentPath))
//             {
//                 var bytes = await File.ReadAllBytesAsync(attachmentPath);
//                 var base64File = Convert.ToBase64String(bytes);

//                 // Add the attachment to the first message in the JArray
//                 (emailBody["Messages"]![0] as JObject)!.Add("Attachments", new JArray
//                 {
//                     new JObject
//                     {
//                         ["ContentType"] = GetMimeType(attachmentPath), 
//                         ["Filename"] = Path.GetFileName(attachmentPath),
//                         ["Base64Content"] = base64File
//                     }
//                 });
//             }

//             // 4. Construct the Mailjet Request
//             MailjetRequest request = new MailjetRequest
//             {
//                 Resource = Send.Resource
//             };
            
//             // Add the email body (messages array) to the request object properties
//             request.Property(Send.Messages, emailBody["Messages"]);

//             // 5. Send the Email
//             MailjetResponse response = await _client.PostAsync(request); 

//             if (!response.IsSuccessStatusCode)
//             {
//                 var errorContent = response.GetErrorMessage();
//                 throw new Exception($"Mailjet email failed. Status: {response.StatusCode}. Error: {errorContent}");
//             }
//         }
        
//         // Helper function for MIME type
//         private static string GetMimeType(string fileName)
//         {
//             var provider = new FileExtensionContentTypeProvider();
//             if (!provider.TryGetContentType(fileName, out var contentType))
//             {
//                 contentType = "application/octet-stream";
//             }
//             return contentType;
//         }
//     }
// }