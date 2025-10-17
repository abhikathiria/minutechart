using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using minutechart.Data;
using minutechart.DTOs;
using minutechart.Models;
using minutechart.Services;
using SendGrid;
using SendGrid.Helpers.Mail;
using minutechart.Helpers;
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace minutechart.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        private readonly MinutechartDbContext _db;
        private readonly ILogger<DatabaseService> _logger;
        private readonly UserManager<AppUser> _userManager;
        private readonly IConfiguration _configuration;
        private readonly DatabaseService _dbService;
        private readonly IEmailSender _emailSender;


        public AdminController(MinutechartDbContext db, UserManager<AppUser> userManager, DatabaseService dbService, IConfiguration configuration, IEmailSender emailSender, ILogger<DatabaseService> logger)
        {
            _db = db;
            _userManager = userManager;
            _dbService = dbService;
            _configuration = configuration;
            _emailSender = emailSender;
            _logger = logger;
        }


        [HttpGet("test-connection")]
        public IActionResult TestDatabaseConnection([FromQuery] string server, string database, string username, string password)
        {
            var dbService = new DatabaseService(_logger);  // Inject or instantiate
            if (dbService.TestConnection(server, database, username, password, out string error))
            {
                return Ok("Connection successful");
            }
            return BadRequest(new { message = "Connection failed", details = error });
        }

        [HttpGet("user/{id}/queries")]
        public async Task<IActionResult> GetUserQueries(string id)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null)
                return NotFound(new { message = "User not found" });

            bool isAdmin = User.IsInRole("Admin");

            var queriesQuery = _db.UserQueries
                .Where(q => q.AppUserId == user.Id);

            if (!isAdmin)
            {
                // Normal users → only show non-hidden queries
                queriesQuery = queriesQuery.Where(q => !q.HideQuery);
            }

            var queries = await queriesQuery
                .OrderByDescending(q => q.UserQueryLastUpdated)
                .ToListAsync();

            return Ok(queries);
        }

        [HttpDelete("delete-query/{id}")]
        public async Task<IActionResult> DeleteUserQuery(int id)
        {
            // Admin is authenticated; no need to restrict to owner
            var query = await _db.UserQueries
                .FirstOrDefaultAsync(q => q.UserQueryId == id);

            if (query == null) return NotFound();

            _db.UserQueries.Remove(query);
            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = "Module deleted successfully" });
        }

        [HttpPost("hide-query/{id}")]
        public async Task<IActionResult> ToggleHideQuery(int id, [FromBody] HideQueryDto request)
        {
            var query = await _db.UserQueries.FirstOrDefaultAsync(q => q.UserQueryId == id);
            if (query == null)
                return NotFound(new { success = false, message = "Module not found" });

            // ✅ Toggle the hidden flag
            query.HideQuery = request.HideQuery;
            var istTime = TimeZoneInfo.ConvertTimeBySystemTimeZoneId(DateTime.UtcNow, "India Standard Time");

            query.UserQueryLastUpdated = istTime;

            await _db.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = request.HideQuery
                    ? $"Module '{query.UserTitle}' hidden successfully."
                    : $"Module '{query.UserTitle}' is now visible."
            });
        }


        [HttpGet("users")]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _db.Users
                .Include(u => u.UserProfile)
                .ToListAsync();

            var nonAdminUsers = new List<object>();

            foreach (var user in users)
            {
                var roles = await _userManager.GetRolesAsync(user);
                if (!roles.Contains("Admin") && user.EmailConfirmed)
                {
                    int trialDaysLeft = 0;
                    if (user.IsTrialActive && user.TrialEndDate.HasValue)
                    {
                        trialDaysLeft = (user.TrialEndDate.Value - DateTimeHelper.GetIndianTime()).Days;
                        if (trialDaysLeft < 0) trialDaysLeft = 0;
                    }

                    string subscriptionStatus = "None";
                    if (user.IsTrialActive) subscriptionStatus = "Trial";
                    else if (user.IsPaidSubscriptionActive) subscriptionStatus = "Active";
                    else if (user.SubscriptionEndDate.HasValue && user.SubscriptionEndDate < DateTimeHelper.GetIndianTime())
                        subscriptionStatus = "Expired";

                    nonAdminUsers.Add(new
                    {
                        user.Id,
                        user.Email,
                        user.CompanyName,
                        user.CustomerName,
                        user.PhoneNumber,
                        user.AccountStatus,
                        ProfileConfigured = user.UserProfile != null,
                        SubscriptionStatus = subscriptionStatus,
                        TrialDaysLeft = trialDaysLeft,
                        TrialStartDate = user.TrialStartDate,
                        TrialEndDate = user.TrialEndDate,
                        SubscriptionStartDate = user.SubscriptionStartDate,
                        SubscriptionEndDate = user.SubscriptionEndDate
                    });
                }
            }

            return Ok(nonAdminUsers);
        }

        [HttpGet("user/{id}/purchases")]
        public async Task<IActionResult> GetUserPurchases(string id)
        {
            var invoices = await _db.Invoices
                .Where(p => p.AppUserId == id)
                .Include(p => p.Plan)
                .OrderByDescending(p => p.PaymentDate)
                .ToListAsync();

            return Ok(invoices.Select(p => new
            {
                InvoiceNumber = p.InvoiceNumber,
                PlanName = p.Plan.Name,
                StartDate = p.PlanStartDate,
                EndDate = p.PlanEndDate,
                Status = p.Status,
                Price = p.Amount,
                PurchaseDate = p.PaymentDate
            }));
        }


        [HttpPost("execute-user-query/{userId}")]
        public async Task<IActionResult> ExecuteUserQuery(string userId, [FromBody] ExecuteQueryRequest req)
        {
            var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == userId);
            if (profile == null)
                return BadRequest(new { success = false, message = "User profile not found" });

            try
            {
                using (var connection = await _dbService.CreateClientConnectionAsync(profile))
                {
                    var cmd = connection.CreateCommand();
                    cmd.CommandText = req.SqlQuery;

                    var reader = await cmd.ExecuteReaderAsync();
                    var table = new List<Dictionary<string, object>>();

                    while (await reader.ReadAsync())
                    {
                        var row = new Dictionary<string, object>();
                        for (int i = 0; i < reader.FieldCount; i++)
                        {
                            row[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);
                        }
                        table.Add(row);
                    }

                    await reader.CloseAsync();
                    return Ok(new { success = true, data = table });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        public class ExecuteQueryRequest
        {
            public string SqlQuery { get; set; }
        }

        public class SaveUserQueryRequest
        {
            public int UserQueryId { get; set; }
            public string UserTitle { get; set; }
            public string UserQueryText { get; set; }
            public string VisualizationType { get; set; }
        }


        [HttpPost("save-user-query/{userId}")]
        public async Task<IActionResult> SaveUserQuery(string userId, [FromBody] SaveUserQueryRequest req)
        {
            var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == userId);
            if (profile == null)
                return BadRequest(new { success = false, message = "User profile not found" });

            try
            {
                // Optional: validate query
                using (var connection = await _dbService.CreateClientConnectionAsync(profile))
                {
                    var cmd = connection.CreateCommand();
                    cmd.CommandText = req.UserQueryText;
                    var reader = await cmd.ExecuteReaderAsync();
                    await reader.CloseAsync();
                }

                var istTime = TimeZoneInfo.ConvertTimeBySystemTimeZoneId(DateTime.UtcNow, "India Standard Time");

                UserQuery userQuery;

                if (req.UserQueryId != 0) // update existing
                {
                    userQuery = await _db.UserQueries.FirstOrDefaultAsync(q => q.UserQueryId == req.UserQueryId && q.AppUserId == userId);
                    if (userQuery == null)
                        return NotFound(new { success = false, message = "Module not found" });

                    userQuery.UserTitle = req.UserTitle;
                    userQuery.UserQueryText = req.UserQueryText;
                    userQuery.VisualizationType = req.VisualizationType;
                    userQuery.UserQueryLastUpdated = istTime;

                    _db.UserQueries.Update(userQuery);
                }
                else // create new
                {
                    userQuery = new UserQuery
                    {
                        AppUserId = userId,
                        UserIpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                        UserTitle = req.UserTitle,
                        UserQueryText = req.UserQueryText,
                        VisualizationType = req.VisualizationType,
                        UserQueryCreatedAtTime = istTime,
                        UserQueryLastUpdated = istTime
                    };
                    _db.UserQueries.Add(userQuery);
                }

                await _db.SaveChangesAsync();

                return Ok(new { success = true, message = "Query saved successfully", query = userQuery });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Query validation failed: {ex.Message}" });
            }
        }


        // ✅ Run a saved query for a user
        [HttpGet("run-saved-query/{userId}/{queryId}")]
        public async Task<IActionResult> RunSavedQuery(string userId, int queryId)
        {
            var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == userId);
            if (profile == null)
                return BadRequest(new { success = false, message = "User profile not found" });

            var query = await _db.UserQueries.FirstOrDefaultAsync(q => q.UserQueryId == queryId && q.AppUserId == userId);
            if (query == null)
                return NotFound(new { success = false, message = "Query not found" });

            try
            {
                using (var connection = await _dbService.CreateClientConnectionAsync(profile))
                {
                    var cmd = connection.CreateCommand();
                    cmd.CommandText = query.UserQueryText;

                    var reader = await cmd.ExecuteReaderAsync();
                    var table = new List<Dictionary<string, object>>();

                    while (await reader.ReadAsync())
                    {
                        var row = new Dictionary<string, object>();
                        for (int i = 0; i < reader.FieldCount; i++)
                        {
                            row[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);
                        }
                        table.Add(row);
                    }

                    await reader.CloseAsync();

                    return Ok(new { success = true, data = table });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("user/{id}/profile")]
        public async Task<IActionResult> GetUserProfile(string id)
        {
            var user = await _db.Users
                .Include(u => u.UserProfile)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
                return NotFound(new { message = "User not found" });

            if (user.UserProfile == null)
            {
                return Ok(new UserProfileDto());
            }

            var dto = new UserProfileDto
            {
                CompanyName = user.CompanyName,
                ServerName = user.UserProfile.ServerName,
                DatabaseName = user.UserProfile.DatabaseName,
                DbUsername = user.UserProfile.DbUsername,
                DbPassword = user.UserProfile.DbPassword,
                RefreshTime = user.UserProfile.RefreshTime
            };

            return Ok(dto);
        }

        [HttpPost("user/{id}/profile")]
        public async Task<IActionResult> SetUserProfile(string id, [FromBody] UserProfileDto model)
        {
            var user = await _db.Users
                .Include(u => u.UserProfile)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
                return NotFound(new { message = "User not found" });

            if (!_dbService.TestConnection(model.ServerName, model.DatabaseName, model.DbUsername, model.DbPassword, out string error))
            {
                return BadRequest(new { message = "Database connection failed", details = error });
            }

            var profile = user.UserProfile;
            if (profile == null)
            {
                profile = new UserProfile
                {
                    AppUserId = user.Id,
                    CompanyName = user.CompanyName,
                    ServerName = model.ServerName,
                    DatabaseName = model.DatabaseName,
                    DbUsername = model.DbUsername,
                    DbPassword = model.DbPassword,
                    RefreshTime = model.RefreshTime
                };
                _db.UserProfiles.Add(profile);
                await _db.SaveChangesAsync();
            }
            else
            {
                profile.CompanyName = user.CompanyName;
                profile.ServerName = model.ServerName;
                profile.DatabaseName = model.DatabaseName;
                profile.DbUsername = model.DbUsername;
                profile.DbPassword = model.DbPassword;
                profile.RefreshTime = model.RefreshTime;
                _db.UserProfiles.Update(profile);
            }

            user.AccountStatus = "Active";
            user.TrialStartDate = DateTimeHelper.GetIndianTime();
            user.TrialEndDate = DateTimeHelper.GetIndianTime().AddDays(7);
            _db.Users.Update(user);
            // await SendAccountActivationEmailAsync(user.Email, user.CustomerName, user.CompanyName);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Profile saved and user activated" });
        }

        private async Task SendAccountActivationEmailAsync(string toEmail, string customerName, string companyName)
        {
            var subject = "Your Nchart Account Has Been Activated";

            var htmlContent = $@"
                <p>Hi {customerName},</p>
                <p>Your <strong>Nchart</strong> account for {companyName} has been <strong>activated</strong> and is now ready to use!</p>
                <p>You can now log in and start exploring our services.</p>
                <p>If you need help, contact <a href='mailto:support@minutechart.com'>support@minutechart.com</a>.</p>
                <p>Warm regards,<br/>Nchart Team</p>";

            var plainTextContent = $@"
Hi {customerName},

Your Nchart account for {companyName} has been activated and is ready to use!

You can now log in and start exploring our services.

For help, contact support@minutechart.com.

Warm regards,
Nchart Team";

            await _emailSender.SendEmailAsync(toEmail, subject, plainTextContent, htmlContent);
        }

        [HttpPost("user/{id}/deactivate")]
        public async Task<IActionResult> DeactivateUser(string id)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
                return NotFound(new { message = "User not found" });

            if (user.AccountStatus == "Blocked")
                return BadRequest(new { message = "User is already blocked" });

            user.AccountStatus = "Blocked";
            _db.Users.Update(user);
            await SendAccountDeactivationEmailAsync(user.Email, user.CustomerName, user.CompanyName);
            await _db.SaveChangesAsync();

            return Ok(new { message = "User account has been blocked" });
        }

        private async Task SendAccountDeactivationEmailAsync(string toEmail, string customerName, string companyName)
        {
            var subject = "Your Nchart Account Has Been Blocked";

            var htmlContent = $@"
                <p>Hi {customerName},</p>
                <p>Your <strong>Nchart</strong> account for {companyName} has been <strong>blocked</strong>.</p>
                <p>Possible reasons include overdue payments, terms violations, or compliance checks.</p>
                <p>If you think this is a mistake, contact <a href='mailto:support@minutechart.com'>support@minutechart.com</a>.</p>
                <p>Warm regards,<br/>Nchart Team</p>";

            var plainTextContent = $@"
Hi {customerName},

Your Nchart account for {companyName} has been blocked.

Possible reasons:
- Overdue payments
- Terms violations
- Compliance checks

If this is a mistake, please contact support@minutechart.com.

Warm regards,
Nchart Team";

            await _emailSender.SendEmailAsync(toEmail, subject, plainTextContent, htmlContent);
        }

        [HttpPost("user/{id}/reactivate")]
        public async Task<IActionResult> ReactivateUser(string id)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
                return NotFound(new { message = "User not found" });

            if (user.AccountStatus == "Active")
                return BadRequest(new { message = "User account is already active" });

            user.AccountStatus = "Active";
            _db.Users.Update(user);
            await SendAccountReactivationEmailAsync(user.Email, user.CustomerName, user.CompanyName);
            await _db.SaveChangesAsync();

            return Ok(new { message = "User account has been reactivated" });
        }

        private async Task SendAccountReactivationEmailAsync(string toEmail, string customerName, string companyName)
        {
            var subject = "Your Nchart Account Has Been Reactivated";

            var htmlContent = $@"
                <p>Hi {customerName},</p>
                <p>Your <strong>Nchart</strong> account for {companyName} has been <strong>reactivated</strong> and is accessible again.</p>
                <p>You can log in and continue using our services.</p>
                <p>For help, contact <a href='mailto:support@minutechart.com'>support@minutechart.com</a>.</p>
                <p>Warm regards,<br/>Nchart Team</p>";

            var plainTextContent = $@"
Hi {customerName},

Your Nchart account for {companyName} has been reactivated and is accessible again.

You can log in and continue using our services.

For help, contact support@minutechart.com.

Warm regards,
Nchart Team";

            await _emailSender.SendEmailAsync(toEmail, subject, plainTextContent, htmlContent);
        }

        [HttpGet("emailsettings")]
        public async Task<IActionResult> Get()
        {
            var settings = await _db.EmailSettings.FirstOrDefaultAsync();
            if (settings == null) return Ok(null);

            return Ok(new
            {
                settings.SmtpHost,
                settings.SmtpPort,
                settings.SmtpUser,
                settings.FromEmail,
                settings.EnableSsl,
                settings.UpdatedAt
                // ⚠️ don’t send raw password
            });
        }

        [HttpPost("emailsettings/save")]
        public async Task<IActionResult> Save([FromBody] EmailSetting model)
        {
            var settings = await _db.EmailSettings.FirstOrDefaultAsync();

            if (settings == null)
            {
                settings = new EmailSetting();
                _db.EmailSettings.Add(settings);
            }

            settings.SmtpHost = model.SmtpHost;
            settings.SmtpPort = model.SmtpPort;
            settings.SmtpUser = model.SmtpUser;
            settings.FromEmail = model.FromEmail;
            settings.EnableSsl = model.EnableSsl;

            if (!string.IsNullOrEmpty(model.SmtpPassword))
            {
                settings.SmtpPassword = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(model.SmtpPassword));
            }

            settings.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return Ok(new { message = "Email settings saved successfully" });
        }

        [HttpPost("emailsettings/test")]
        public async Task<IActionResult> Test([FromBody] string toEmail)
        {
            var sender = HttpContext.RequestServices.GetRequiredService<IEmailSender>();
            await sender.SendEmailAsync(toEmail, "Test Email", "This is a test email", "<p>This is a <b>test email</b></p>");
            return Ok(new { message = "Test email sent" });
        }

        [HttpGet("invoicesettings")]
        public async Task<IActionResult> GetInvoiceSettings()
        {
            var settings = await _db.CompanyInvoiceSettings
                .Include(s => s.Columns)
                .FirstOrDefaultAsync();

            var baseUrl = $"{Request.Scheme}://{Request.Host}";

            if (settings == null)
            {
                var emptyDto = new InvoiceSettingsDto
                {
                    CompanyLogoPath = "",
                    OwnerSignaturePath = "",
                    CompanyName = "",
                    CompanyAddress = "",
                    CompanyPhone = "",
                    CompanyEmail = "",
                    CompanyWebsite = "",
                    GstNumber = "",
                    OwnerName = "",
                    PayableTo = "",
                    OtherDetails = "",
                    BankName = "",
                    BranchName = "",
                    BankAccountNumber = "",
                    IFSC = "",
                    IgstPercent = 18,
                    CgstPercent = 9,
                    SgstPercent = 9,
                    TermsAndConditions = "",
                    ShowGst = true,
                    ShowBankDetails = true,
                    ShowWebsite = false,
                    ShowSignature = true,
                    ShowTermsAndConditions = true,
                    Columns = new List<InvoiceColumnDto>
                    {
                        new InvoiceColumnDto { ColumnKey = "srno", ColumnName = "SL NO", IsVisible = true, Order = 0 },
                        new InvoiceColumnDto { ColumnKey = "details", ColumnName = "DESCRIPTION", IsVisible = true, Order = 1 },
                        new InvoiceColumnDto { ColumnKey = "rate", ColumnName = "RATE", IsVisible = true, Order = 2 },
                        new InvoiceColumnDto { ColumnKey = "quantity", ColumnName = "QUANTITY", IsVisible = true, Order = 3 },
                        new InvoiceColumnDto { ColumnKey = "amount", ColumnName = "AMOUNT", IsVisible = true, Order = 4 },
                    }
                };
                return Ok(emptyDto);
            }

            var dto = new InvoiceSettingsDto
            {
                CompanyLogoPath = !string.IsNullOrEmpty(settings.CompanyLogoPath)
                    ? (settings.CompanyLogoPath.StartsWith("http") ? settings.CompanyLogoPath : $"{baseUrl}{settings.CompanyLogoPath}")
                    : "",
                OwnerSignaturePath = !string.IsNullOrEmpty(settings.OwnerSignaturePath)
                    ? (settings.OwnerSignaturePath.StartsWith("http") ? settings.OwnerSignaturePath : $"{baseUrl}{settings.OwnerSignaturePath}")
                    : "",
                CompanyName = settings.CompanyName,
                CompanyAddress = settings.CompanyAddress,
                CompanyPhone = settings.CompanyPhone,
                CompanyEmail = settings.CompanyEmail,
                CompanyWebsite = settings.CompanyWebsite,
                GstNumber = settings.GstNumber,
                OwnerName = settings.OwnerName,
                PayableTo = settings.PayableTo,
                OtherDetails = settings.OtherDetails,
                BankName = settings.BankName,
                BranchName = settings.BranchName,
                BankAccountNumber = settings.BankAccountNumber,
                IFSC = settings.IFSC,
                IgstPercent = settings.IgstPercent,
                CgstPercent = settings.CgstPercent,
                SgstPercent = settings.SgstPercent,
                TermsAndConditions = settings.TermsAndConditions,
                ShowGst = settings.ShowGst,
                ShowBankDetails = settings.ShowBankDetails,
                ShowWebsite = settings.ShowWebsite,
                ShowSignature = settings.ShowSignature,
                ShowTermsAndConditions = settings.ShowTermsAndConditions,
                Columns = settings.Columns
                    .OrderBy(c => c.SortOrder)
                    .Select(c => new InvoiceColumnDto
                    {
                        Id = c.Id,
                        ColumnKey = c.ColumnKey,
                        ColumnName = c.ColumnName,
                        IsVisible = c.IsVisible,
                        Order = c.SortOrder
                    }).ToList()
            };

            return Ok(dto);
        }

        [HttpPost("invoicesettings/save")]
        public async Task<IActionResult> SaveInvoiceSettings([FromBody] InvoiceSettingsDto dto)
        {
            if (dto == null) return BadRequest("DTO is required.");

            var settings = await _db.CompanyInvoiceSettings
                .Include(s => s.Columns)
                .FirstOrDefaultAsync();

            if (settings == null)
            {
                settings = new CompanyInvoiceSetting();
                _db.CompanyInvoiceSettings.Add(settings);
            }

            // Map simple fields
            settings.CompanyName = dto.CompanyName;
            settings.CompanyAddress = dto.CompanyAddress;
            settings.CompanyPhone = dto.CompanyPhone;
            settings.CompanyEmail = dto.CompanyEmail;
            settings.CompanyWebsite = dto.CompanyWebsite;
            settings.GstNumber = dto.GstNumber;
            settings.OwnerName = dto.OwnerName;
            settings.OwnerSignaturePath = dto.OwnerSignaturePath;
            settings.PayableTo = dto.PayableTo;
            settings.OtherDetails = dto.OtherDetails;
            settings.BankName = dto.BankName;
            settings.BranchName = dto.BranchName;
            settings.BankAccountNumber = dto.BankAccountNumber;
            settings.IFSC = dto.IFSC;
            settings.IgstPercent = dto.IgstPercent;
            settings.CgstPercent = dto.IgstPercent / 2;
            settings.SgstPercent = dto.IgstPercent / 2;
            settings.TermsAndConditions = dto.TermsAndConditions;
            settings.ShowGst = dto.ShowGst;
            settings.ShowBankDetails = dto.ShowBankDetails;
            settings.ShowWebsite = dto.ShowWebsite;
            settings.ShowSignature = dto.ShowSignature;
            settings.ShowTermsAndConditions = dto.ShowTermsAndConditions;
            settings.UpdatedAt = DateTime.UtcNow;

            if (settings.Columns == null) settings.Columns = new List<InvoiceColumnSetting>();

            // Remove deleted columns
            var dtoColumnIds = dto.Columns.Where(c => c.Id.HasValue).Select(c => c.Id.Value).ToList();
            var columnsToRemove = settings.Columns.Where(c => !dtoColumnIds.Contains(c.Id)).ToList();
            foreach (var col in columnsToRemove)
            {
                _db.InvoiceColumnSettings.Remove(col);
            }

            // Add or update columns
            foreach (var dtoCol in dto.Columns)
            {
                if (dtoCol.Id.HasValue && dtoCol.Id.Value > 0)
                {
                    var col = settings.Columns.FirstOrDefault(c => c.Id == dtoCol.Id.Value);
                    if (col != null)
                    {
                        col.ColumnName = dtoCol.ColumnName;
                        col.IsVisible = dtoCol.IsVisible;
                        col.SortOrder = dtoCol.Order;
                    }
                }
                else
                {
                    settings.Columns.Add(new InvoiceColumnSetting
                    {
                        ColumnName = dtoCol.ColumnName,
                        IsVisible = dtoCol.IsVisible,
                        SortOrder = dtoCol.Order
                    });
                }
            }

            await _db.SaveChangesAsync();
            return Ok(new { message = "Invoice settings saved successfully" });
        }

        [HttpPost("invoicesettings/upload-image")]
        public async Task<IActionResult> UploadImage(IFormFile file, [FromQuery] string type)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded");

            var uploadsFolder = Path.Combine("wwwroot", "uploads", "invoice");
            if (!Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

            var fileName = $"{Guid.NewGuid()}_{file.FileName}";
            var filePath = Path.Combine(uploadsFolder, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var relativePath = $"/uploads/invoice/{fileName}";
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var publicUrl = $"{baseUrl}{relativePath}";
            var settings = await _db.CompanyInvoiceSettings.FirstOrDefaultAsync();

            if (settings == null)
            {
                settings = new CompanyInvoiceSetting();
                _db.CompanyInvoiceSettings.Add(settings);
            }

            if (type == "logo")
                settings.CompanyLogoPath = publicUrl;
            else if (type == "signature")
                settings.OwnerSignaturePath = publicUrl;

            await _db.SaveChangesAsync();

            return Ok(new { path = publicUrl });
        }

        [HttpPost("transfer-modules")]
        public IActionResult TransferModules([FromBody] TransferModulesRequest request)
        {
            if (string.IsNullOrEmpty(request.SourceUserId) ||
                string.IsNullOrEmpty(request.TargetUserId) ||
                request.ModuleIds == null || request.ModuleIds.Count == 0)
            {
                return BadRequest(new { success = false, message = "Invalid input" });
            }

            // Fetch modules from source user and target user
            var sourceModules = _db.UserQueries
                .Where(q => q.AppUserId == request.SourceUserId && request.ModuleIds.Contains(q.UserQueryId))
                .ToList();

            var targetModules = _db.UserQueries
                .Where(q => q.AppUserId == request.TargetUserId)
                .ToList();

            var duplicates = new List<UserQuery>();
            var copied = new List<UserQuery>();

            // Detect duplicates and prepare for action
            foreach (var sm in sourceModules)
            {
                var existing = targetModules.FirstOrDefault(tm =>
                    tm.UserTitle == sm.UserTitle && tm.UserQueryText == sm.UserQueryText);

                if (existing != null)
                {
                    duplicates.Add(existing);

                    // Handle based on requested action
                    if (request.Action == "replace")
                    {
                        _db.UserQueries.Remove(existing);
                    }
                    else if (request.Action == "ignore")
                    {
                        continue; // skip this one
                    }
                    else if (request.Action == "cancel" || request.Action == "check")
                    {
                        continue;
                    }
                }

                // Only add new module if not cancelling/checking
                if (request.Action != "cancel" && request.Action != "check")
                {
                    var newQuery = new UserQuery
                    {
                        AppUserId = request.TargetUserId,
                        UserTitle = sm.UserTitle,
                        UserQueryText = sm.UserQueryText,
                        VisualizationType = sm.VisualizationType,
                        UserQueryCreatedAtTime = DateTime.UtcNow,
                        UserQueryLastUpdated = DateTime.UtcNow,
                        UserIpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
                    };

                    _db.UserQueries.Add(newQuery);
                    copied.Add(newQuery);
                }
            }

            // ✅ Handle check mode separately
            if (request.Action == "check")
            {
                if (duplicates.Any())
                {
                    // duplicates found → send back to frontend
                    return Ok(new
                    {
                        success = false,
                        duplicates = duplicates.Select(d => new
                        {
                            d.UserQueryId,
                            d.UserTitle
                        })
                    });
                }
                else
                {
                    // no duplicates → directly transfer all modules
                    foreach (var sm in sourceModules)
                    {
                        var newQuery = new UserQuery
                        {
                            AppUserId = request.TargetUserId,
                            UserTitle = sm.UserTitle,
                            UserQueryText = sm.UserQueryText,
                            VisualizationType = sm.VisualizationType,
                            UserQueryCreatedAtTime = DateTime.UtcNow,
                            UserQueryLastUpdated = DateTime.UtcNow,
                            UserIpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
                        };
                        _db.UserQueries.Add(newQuery);
                        copied.Add(newQuery);
                    }

                    _db.SaveChanges();

                    return Ok(new
                    {
                        success = true,
                        message = $"{copied.Count} modules transferred successfully (no duplicates found)."
                    });
                }
            }

            // Save changes for replace / ignore actions
            _db.SaveChanges();

            return Ok(new
            {
                success = true,
                message = request.Action switch
                {
                    "replace" => $"{copied.Count} modules transferred and duplicates replaced.",
                    "ignore" => $"{copied.Count} modules transferred, duplicates ignored.",
                    "cancel" => "Transfer cancelled.",
                    _ => $"{copied.Count} modules transferred successfully."
                }
            });
        }

        public class TransferModulesRequest
        {
            public string SourceUserId { get; set; }
            public string TargetUserId { get; set; }
            public List<int> ModuleIds { get; set; }
            public string Action { get; set; } = "check"; // check, replace, ignore, cancel
        }
    }


    // 🔹 DTO for profile input/output
    public class UserProfileDto
    {
        public string CompanyName { get; set; }
        public string ServerName { get; set; }
        public string DatabaseName { get; set; }
        public string DbUsername { get; set; }
        public string DbPassword { get; set; }
        public int RefreshTime { get; set; }
    }
}
