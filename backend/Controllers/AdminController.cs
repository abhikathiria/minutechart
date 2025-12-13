using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using minutechart.Data;
using minutechart.DTOs;
using minutechart.Models;
using minutechart.Services;
using minutechart.Helpers;
using System.Text.Json;
using System.Security.Claims;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using SendGrid;
using SendGrid.Helpers.Mail;
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
        private readonly ActivityLogger _activityLogger;

        private readonly string _uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "invoice");

        public AdminController(MinutechartDbContext db, UserManager<AppUser> userManager, DatabaseService dbService, IConfiguration configuration, IEmailSender emailSender, ILogger<DatabaseService> logger, ActivityLogger activityLogger)
        {
            _db = db;
            _userManager = userManager;
            _dbService = dbService;
            _configuration = configuration;
            _emailSender = emailSender;
            _activityLogger = activityLogger;
            _logger = logger;
            Directory.CreateDirectory(_uploadsFolder);

        }

        private async Task<Pricing?> GetActivePlanAsync(AppUser user)
        {
            var now = DateTimeHelper.GetIndianTime();

            var invoices = await _db.PlanInvoices
                .Include(p => p.Plan)
                .Where(p => p.AppUserId == user.Id && p.Status == "Paid")
                .OrderByDescending(p => p.PaymentDate)
                .ToListAsync();

            foreach (var inv in invoices)
            {
                // If dates missing, fallback to default 30 days
                var start = inv.PlanStartDate ?? inv.PaymentDate;
                var end = inv.PlanEndDate ?? inv.PaymentDate.AddMonths(1);

                if (start <= now && now <= end)
                    return inv.Plan;
            }

            return null;
        }

        private async Task<(int used, int remaining)> GetUserModuleUsage(string userId)
        {
            var limits = await GetLimitsInternal(userId);
            int dashboardLimit = limits.dashboardLimit;

            // Count only visible modules
            int used = await _db.UserQueries
                .Where(q => q.AppUserId == userId && !q.HideQuery)
                .CountAsync();

            int remaining = Math.Max(dashboardLimit - used, 0);

            return (used, remaining);
        }

        private async Task<(int dashboardLimit, int refreshMinutes, bool excelExport)> GetLimitsInternal(string userId)
        {
            var user = await _userManager.Users
                .Include(u => u.UserProfile)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                return (0, 0, false);

            var now = DateTimeHelper.GetIndianTime();

            // TRIAL — uses Pro plan always
            if (user.IsTrialActive)
            {
                var pro = await _db.Pricings.FirstOrDefaultAsync(p => p.TierOrder == 3);
                if (pro == null)
                    return (0, 0, false);

                // ALSO add any purchased add-ons (user may buy addon during trial)
                var addonCount = await _db.UserAddons
                    .Where(a => a.AppUserId == user.Id && a.EndDate > now)
                    .SumAsync(a => a.Dashboards);

                return (
                    pro.DashboardLimit + addonCount,
                    pro.RefreshRateMinutes,
                    pro.ExcelExport
                );
            }

            // ACTIVE PLAN CHECK
            var activePlan = await GetActivePlanAsync(user);

            if (activePlan == null)
                return (0, 0, false); // No plan = no addons allowed

            // ADD-ON DASHBOARDS (only active, only if plan allows addons)
            var activeAddonsAllowed = activePlan.DashboardAddonEnabled;

            int addonDash = 0;

            if (activeAddonsAllowed)
            {
                addonDash = await _db.UserAddons
                    .Where(a => a.AppUserId == user.Id && a.EndDate > now)
                    .SumAsync(a => a.Dashboards);
            }

            return (
                activePlan.DashboardLimit + addonDash,
                activePlan.RefreshRateMinutes,
                activePlan.ExcelExport
            );
        }

        [HttpGet("user/{id}/queries")]
        public async Task<IActionResult> GetUserQueries(string id)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null)
                return NotFound(new { message = "User not found" });

            bool isAnyAdmin = User.IsInRole("Admin") || User.IsInRole("SuperAdmin");

            var queriesQuery = _db.UserQueries
                .Where(q => q.AppUserId == user.Id);

            if (!isAnyAdmin)
            {
                // Normal users → only show non-hidden queries
                queriesQuery = queriesQuery.Where(q => !q.HideQuery);
            }

            var queries = await queriesQuery
                .OrderByDescending(q => q.UserQueryLastUpdated)
                .ToListAsync();

            // LOG: Admin viewed user's modules
            await _activityLogger.LogAsync("viewed modules for", "User", user.UserName ?? user.Email);

            return Ok(queries);
        }

        [HttpDelete("delete-query/{id}")]
        public async Task<IActionResult> DeleteUserQuery(int id)
        {
            var query = await _db.UserQueries
                .Include(q => q.AppUser) // Include user for logging target name
                .FirstOrDefaultAsync(q => q.UserQueryId == id);

            if (query == null) return NotFound();

            var targetUserName = query.AppUser?.UserName ?? query.AppUser?.Email ?? "N/A";
            var queryTitle = query.UserTitle;

            _db.UserQueries.Remove(query);
            await _db.SaveChangesAsync();

            // LOG: Admin deleted a module
            await _activityLogger.LogAsync("deleted module", "Module", queryTitle, targetUserName);

            return Ok(new { success = true, message = "Module deleted successfully" });
        }

        [HttpPost("hide-query/{id}")]
        public async Task<IActionResult> ToggleHideQuery(int id, [FromBody] HideQueryDto request)
        {
            var query = await _db.UserQueries
                .Include(q => q.AppUser)
                .FirstOrDefaultAsync(q => q.UserQueryId == id);

            if (query == null)
                return NotFound(new { success = false, message = "Module not found" });

            // only check when making visible
            if (!request.HideQuery)
            {
                var userId = query.AppUserId;

                var usage = await GetUserModuleUsage(userId);
                if (usage.remaining <= 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Module limit reached. Cannot make this module visible."
                    });
                }
            }

            query.HideQuery = request.HideQuery;
            query.UserQueryLastUpdated = DateTimeHelper.GetIndianTime();
            await _db.SaveChangesAsync();

            string action = request.HideQuery ? "hid module" : "made module visible";
            await _activityLogger.LogAsync(action, "Module", query.UserTitle, query.AppUser?.UserName);

            return Ok(new
            {
                success = true,
                message = request.HideQuery
                    ? $"Module '{query.UserTitle}' hidden successfully."
                    : $"Module '{query.UserTitle}' is now visible."
            });
        }

        [HttpPost("execute-user-query/{userId}")]
        public async Task<IActionResult> ExecuteUserQuery(string userId, [FromBody] ExecuteQueryRequest req)
        {
            var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == userId);
            if (profile == null)
                return BadRequest(new { success = false, message = "User profile not found" });

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            var targetUserName = user?.UserName ?? user?.Email ?? userId;

            try
            {
                using (var connection = await _dbService.CreateClientConnectionAsync(profile))
                {
                    var cmd = connection.CreateCommand();

                    // Fix: Prepend semicolon if query starts with WITH (handles CTE syntax issues)
                    string sql = req.SqlQuery.Trim();

                    // Inject SHORTNAME
                    sql = SQLShortNameHelper.InjectShortName(sql, profile.ShortName);

                    // Fix CTE edge case
                    if (sql.StartsWith("WITH", StringComparison.OrdinalIgnoreCase))
                    {
                        sql = ";" + sql;
                    }

                    cmd.CommandText = sql;


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

                    // LOG: Successful query execution
                    // Note: Since this endpoint is often used for query testing/creation, logging execution is highly valuable.
                    await _activityLogger.LogAsync("executed custom query for", "User Database", targetUserName);

                    return Ok(new { success = true, data = table });
                }
            }
            catch (Exception ex)
            {
                // LOG: Failed query execution
                await _activityLogger.LogAsync("failed to execute custom query for", "User Database", targetUserName);
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


            public bool IsApprovalModule { get; set; } = false;
            public string ApprovalUpdateQuery { get; set; } = "";
            public string ApprovalIdColumn { get; set; } = "";
        }

        [HttpPost("save-user-query/{userId}")]
        public async Task<IActionResult> SaveUserQuery(string userId, [FromBody] SaveUserQueryRequest req)
        {
            var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == userId);
            if (profile == null)
                return BadRequest(new { success = false, message = "User profile not found" });

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            var targetUserName = user?.UserName ?? user?.Email ?? userId;

            try
            {
                // Optional: validate query
                using (var connection = await _dbService.CreateClientConnectionAsync(profile))
                {
                    var cmd = connection.CreateCommand();
                    var sql = SQLShortNameHelper.InjectShortName(req.UserQueryText, profile.ShortName);
                    cmd.CommandText = sql;
                    var reader = await cmd.ExecuteReaderAsync();
                    await reader.CloseAsync();
                }

                UserQuery userQuery;
                string action;

                if (req.UserQueryId != 0) // update existing
                {
                    userQuery = await _db.UserQueries.FirstOrDefaultAsync(q => q.UserQueryId == req.UserQueryId && q.AppUserId == userId);
                    if (userQuery == null)
                        return NotFound(new { success = false, message = "Module not found" });

                    // Capture old title for logging if it changed
                    var oldTitle = userQuery.UserTitle;

                    // ... (Update fields logic remains) ...
                    userQuery.UserTitle = req.UserTitle;
                    userQuery.UserQueryText = req.UserQueryText;
                    userQuery.VisualizationType = req.VisualizationType;
                    userQuery.UserQueryLastUpdated = DateTimeHelper.GetIndianTime();
                    userQuery.IsApprovalModule = req.IsApprovalModule;
                    userQuery.ApprovalUpdateQuery = req.IsApprovalModule ? req.ApprovalUpdateQuery : "";
                    userQuery.ApprovalIdColumn = req.IsApprovalModule ? req.ApprovalIdColumn : "";

                    _db.UserQueries.Update(userQuery);
                    action = "updated module";
                }
                else // create new
                {
                    var usage = await GetUserModuleUsage(userId);

                    if (usage.remaining <= 0)
                    {
                        return BadRequest(new
                        {
                            success = false,
                            message = "Module limit reached. Upgrade your plan to add more modules."
                        });
                    }

                    userQuery = new UserQuery
                    {
                        AppUserId = userId,
                        UserIpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                        UserTitle = req.UserTitle,
                        UserQueryText = req.UserQueryText,
                        VisualizationType = req.VisualizationType,
                        UserQueryCreatedAtTime = DateTimeHelper.GetIndianTime(),
                        UserQueryLastUpdated = DateTimeHelper.GetIndianTime(),
                        IsApprovalModule = req.IsApprovalModule,
                        ApprovalUpdateQuery = req.IsApprovalModule ? req.ApprovalUpdateQuery : "",
                        ApprovalIdColumn = req.IsApprovalModule ? req.ApprovalIdColumn : ""
                    };

                    _db.UserQueries.Add(userQuery);
                    action = "created new module";
                }

                if (req.IsApprovalModule)
                {
                    if (string.IsNullOrEmpty(req.ApprovalUpdateQuery) || !req.ApprovalUpdateQuery.Contains("@id") ||
                        string.IsNullOrEmpty(req.ApprovalIdColumn))
                    {
                        return BadRequest(new { success = false, message = "Approval module requires a valid update query with '?' placeholder and ID column." });
                    }
                }

                await _db.SaveChangesAsync();

                // LOG: Admin saved/updated a module for a user
                await _activityLogger.LogAsync(action, "Module", req.UserTitle, targetUserName);

                return Ok(new
                {
                    success = true,
                    message = "Query saved successfully",
                    query = new
                    {
                        UserQueryId = userQuery.UserQueryId,
                        UserTitle = userQuery.UserTitle,
                        VisualizationType = userQuery.VisualizationType,
                        IsApprovalModule = userQuery.IsApprovalModule
                    }
                });
            }
            catch (Exception ex)
            {
                // LOG: Failed to save/update module
                await _activityLogger.LogAsync("failed to save module", "Module", req.UserTitle, targetUserName);
                return BadRequest(new { success = false, message = $"Query validation failed: {ex.Message}" });
            }
        }

        [HttpPost("approve-row/{userId}")]
        public async Task<IActionResult> ApproveRow(string userId, [FromBody] ApproveRowRequest req)
        {
            var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == userId);
            if (profile == null)
                return BadRequest(new { success = false, message = "User profile not found" });

            var query = await _db.UserQueries.FirstOrDefaultAsync(q => q.UserQueryId == req.QueryId && q.AppUserId == userId);
            if (query == null || !query.IsApprovalModule)
                return NotFound(new { success = false, message = "Approval module not found" });

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            var targetUserName = user?.UserName ?? user?.Email ?? userId;

            try
            {
                using (var connection = await _dbService.CreateClientConnectionAsync(profile))
                {
                    var cmd = connection.CreateCommand();
                    cmd.CommandText = query.ApprovalUpdateQuery;

                    if (req.RowId is JsonElement jsonElement)
                    {
                        if (jsonElement.ValueKind == JsonValueKind.Number)
                        {
                            cmd.Parameters.AddWithValue("@id", jsonElement.GetInt32());  // For integer IDs
                        }
                        else if (jsonElement.ValueKind == JsonValueKind.String)
                        {
                            cmd.Parameters.AddWithValue("@id", jsonElement.GetString());  // For string IDs (e.g., GUIDs)
                        }
                        else
                        {
                            return BadRequest(new { success = false, message = "Invalid RowId type. Must be a number or string." });
                        }
                    }
                    else
                    {
                        cmd.Parameters.AddWithValue("@id", req.RowId);
                    }
                    await cmd.ExecuteNonQueryAsync();
                }

                // LOG: Admin approved a row
                await _activityLogger.LogAsync("approved row (ID:" + req.RowId + ") using module", "Approval Module", query.UserTitle, targetUserName);

                return Ok(new { success = true, message = "Row approved successfully" });
            }
            catch (Exception ex)
            {
                // LOG: Failed to approve row
                await _activityLogger.LogAsync("failed to approve row (ID:" + req.RowId + ") using module", "Approval Module", query.UserTitle, targetUserName);
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
        public class ApproveRowRequest
        {
            public int QueryId { get; set; }
            public object RowId { get; set; }  // ID value from the row
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

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            var targetUserName = user?.UserName ?? user?.Email ?? userId;

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

                    // LOG: Admin ran a saved query
                    await _activityLogger.LogAsync("ran saved query", "Query", query.UserTitle, targetUserName);

                    return Ok(new { success = true, data = table });
                }
            }
            catch (Exception ex)
            {
                // LOG: Failed to run saved query
                await _activityLogger.LogAsync("failed to run saved query", "Query", query.UserTitle, targetUserName);
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ------------------ OTHER ENDPOINTS (No log needed for read-only/DTO helper) ------------------

        [HttpGet("users")]
        [Authorize(Roles = "SuperAdmin,Admin")]
        public async Task<IActionResult> GetUsers()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            var currentRoles = await _userManager.GetRolesAsync(currentUser);

            // Determine the current user's specific roles for logic branching
            bool isSuperAdmin = currentRoles.Contains("SuperAdmin");
            bool isStandardAdmin = currentRoles.Contains("Admin") && !isSuperAdmin;

            await _activityLogger.LogAsync("viewed the list of", "Users", isSuperAdmin ? "all" : "filtered by assignment");

            IQueryable<AppUser> query = _db.Users.Include(u => u.UserProfile);

            // 🧠 SuperAdmin sees all, Standard Admin sees only assigned users
            if (isStandardAdmin) // Only apply filter if the user is *only* a standard Admin
            {
                query = query.Where(u => u.AssignedAdminId == currentUser.Id);
            }
            // If SuperAdmin, no WHERE clause is added here, so the query defaults to all users.

            var users = await query.ToListAsync();
            var userList = new List<object>();

            foreach (var user in users)
            {
                var userRoles = await _userManager.GetRolesAsync(user);

                // Skip users with the 'SuperAdmin' role.
                if (userRoles.Contains("SuperAdmin"))
                {
                    continue;
                }

                // Skip any user that is NOT confirmed
                if (!user.EmailConfirmed)
                {
                    continue;
                }

                bool isUserAdmin = userRoles.Contains("Admin");

                // 🛑 EXCLUSION LOGIC for Standard Admin View:
                // If the current viewer is a Standard Admin, they CANNOT see other Admins.
                if (isStandardAdmin && isUserAdmin)
                {
                    continue; // Skip this user because a Standard Admin shouldn't see them.
                }

                // --- Safe Projection ---
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

                userList.Add(new
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
                    SubscriptionEndDate = user.SubscriptionEndDate,
                    AssignedAdminId = user.AssignedAdminId
                });
            }

            return Ok(userList);
        }


        [HttpGet("user/{id}/purchases")]
        public async Task<IActionResult> GetUserPurchases(string id)
        {
            var invoices = await _db.Invoices
                .Where(p => p.AppUserId == id)
                .Include(p => p.Plan)
                .OrderByDescending(p => p.PaymentDate)
                .ToListAsync();
            // ... (rest of logic remains) ...

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

        [HttpGet("user/{id}/profile")]
        public async Task<IActionResult> GetUserProfile(string id)
        {
            var user = await _db.Users
                .Include(u => u.UserProfile)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
                return NotFound(new { message = "User not found" });

            // LOG: Admin viewed user's profile (logged in previous AdminController full update, retained here for context)
            await _activityLogger.LogAsync("viewed profile details for", "User", user.UserName ?? user.Email);

            if (user.UserProfile == null)
            {
                return Ok(new UserProfileDto
                {
                    CustomerGST = user.GST ?? ""
                });
            }

            var dto = new UserProfileDto
            {
                CompanyName = user.CompanyName,
                CustomerGST = user.UserProfile.CustomerGST ?? user.GST ?? "",  // Default to AppUser.GST if profile GST is null
                CustomerCode = user.UserProfile.CustomerCode ?? "",
                ShortName = user.UserProfile.ShortName ?? "",
                ServerName = user.UserProfile.ServerName,
                ProfilePhotoUrl = user.UserProfile.ProfilePhotoUrl,
                CompanyLogoUrl = user.UserProfile.CompanyLogoUrl,
                DatabaseName = user.UserProfile.DatabaseName,
                DbUsername = user.UserProfile.DbUsername,
                DbPassword = user.UserProfile.DbPassword,
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
                // LOG: Failed profile set (Connection failed)
                await _activityLogger.LogAsync("failed to set/update profile (DB connection failed) for", "User", user.UserName ?? user.Email);
                return BadRequest(new { message = "Database connection failed", details = error });
            }

            var profile = user.UserProfile;
            bool isNewProfile = (profile == null);

            if (isNewProfile)
            {
                // --- Profile Creation (Activation/Trial Start) ---

                // --- UPDATED CustomerCode Generation logic to use model data ---
                var regYear = user.RegistrationDate?.Year.ToString() ?? DateTimeHelper.GetIndianTime().Year.ToString();
                // Use model.CompanyName for code generation on first creation
                var companyWords = model.CompanyName?.Split(' ', StringSplitOptions.RemoveEmptyEntries) ?? new string[0];
                var companyInitials = string.Join("", companyWords.Take(2).Select(w => w[0])).ToUpper();
                // Use model.CustomerName for code generation on first creation
                var customerWords = model.CustomerName?.Split(' ', StringSplitOptions.RemoveEmptyEntries) ?? new string[0];
                var customerInitials = string.Join("", customerWords.Select(w => w[0])).ToUpper();
                var userIdPart = $"{user.Id.Substring(0, 2)}{user.Id.Substring(user.Id.Length - 2)}".ToUpper();
                var customerCode = $"C-{regYear}-{companyInitials}{customerInitials}-{userIdPart}";
                // -----------------------------------------------------------------

                profile = new UserProfile
                {
                    AppUserId = user.Id,
                    // Set CompanyName/CustomerCode from the DTO for new profile
                    CompanyName = model.CompanyName ?? user.CompanyName,
                    ServerName = model.ServerName,
                    DatabaseName = model.DatabaseName,
                    ShortName = model.ShortName,
                    DbUsername = model.DbUsername,
                    DbPassword = model.DbPassword,
                    CustomerGST = model.CustomerGST ?? user.GST ?? "",
                    CustomerCode = customerCode
                };
                _db.UserProfiles.Add(profile);
                await _db.SaveChangesAsync(); // Save profile first to get ID/link relationship

                // Activate user and set trial dates only on first creation
                user.AccountStatus = "Active";
                user.TrialStartDate = DateTimeHelper.GetIndianTime();
                user.TrialEndDate = DateTimeHelper.GetIndianTime().AddMonths(1);
                // --- UPDATED: Update AppUser fields based on model ---
                user.CompanyName = model.CompanyName ?? user.CompanyName;
                user.CustomerName = model.CustomerName ?? user.CustomerName;
                // ----------------------------------------------------
                _db.Users.Update(user);
                await _db.SaveChangesAsync();

                // LOG: Admin created new profile and activated user
                await _activityLogger.LogAsync("created new profile (including DB connection) and activated trial for", "User", user.UserName ?? user.Email);
            }
            else
            {
                // --- Profile Update ---

                // Capture old details for logging significance
                var oldServer = profile.ServerName;
                var oldDB = profile.DatabaseName;

                // Update logic (remains)
                // NOTE: You might want to check if CompanyName/CustomerName from model differ from user's current values
                profile.CompanyName = model.CompanyName ?? user.CompanyName; // Update profile company name from model or existing user value
                profile.ShortName = model.ShortName;
                profile.ServerName = model.ServerName;
                profile.DatabaseName = model.DatabaseName;
                profile.DbUsername = model.DbUsername;
                profile.DbPassword = model.DbPassword;
                profile.CompanyLogoUrl = model.CompanyLogoUrl ?? profile.CompanyLogoUrl;
                profile.CustomerGST = model.CustomerGST ?? user.GST ?? "";

                // Update AppUser fields if they were present in the model and changed
                if (!string.IsNullOrEmpty(model.CompanyName) && user.CompanyName != model.CompanyName)
                {
                    user.CompanyName = model.CompanyName;
                }
                if (!string.IsNullOrEmpty(model.CustomerName) && user.CustomerName != model.CustomerName)
                {
                    user.CustomerName = model.CustomerName;
                }

                _db.UserProfiles.Update(profile);
                user.GST = model.CustomerGST ?? user.GST ?? ""; // Also update AppUser.GST
                _db.Users.Update(user);
                await _db.SaveChangesAsync();

                // Determine log message based on what was updated
                string updateMessage;
                if (oldServer != model.ServerName || oldDB != model.DatabaseName)
                {
                    updateMessage = "updated database connection details for";
                }
                else
                {
                    updateMessage = "updated profile settings for";
                }

                // LOG: Admin updated existing profile
                await _activityLogger.LogAsync(updateMessage, "User", user.UserName ?? user.Email);
            }

            return Ok(new { message = "Profile saved successfully" });
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
            // await SendAccountDeactivationEmailAsync(user.Email, user.CustomerName, user.CompanyName);
            await _db.SaveChangesAsync();

            // LOG: Admin blocked a user account
            await _activityLogger.LogAsync("blocked account for", "User", user.UserName ?? user.Email);

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
            // await SendAccountReactivationEmailAsync(user.Email, user.CustomerName, user.CompanyName);
            await _db.SaveChangesAsync();

            // LOG: Admin reactivated a user account
            await _activityLogger.LogAsync("reactivated account for", "User", user.UserName ?? user.Email);

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
        [Authorize(Roles = "SuperAdmin,Admin")]
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
            });
        }

        [HttpPost("emailsettings/save")]
        public async Task<IActionResult> Save([FromBody] EmailSetting model)
        {
            var settings = await _db.EmailSettings.FirstOrDefaultAsync();

            bool isNew = (settings == null);

            if (isNew)
            {
                settings = new EmailSetting();
                _db.EmailSettings.Add(settings);
            }

            // Capture old settings before applying model (optional for diff logging)
            var oldSmtpHost = settings.SmtpHost;

            // Apply updates
            settings.SmtpHost = model.SmtpHost;
            settings.SmtpPort = model.SmtpPort;
            settings.SmtpUser = model.SmtpUser;
            settings.FromEmail = model.FromEmail;
            settings.EnableSsl = model.EnableSsl;

            if (!string.IsNullOrEmpty(model.SmtpPassword))
            {
                // Password is being saved/updated
                settings.SmtpPassword = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(model.SmtpPassword));

                // LOG: High-value target: Log password change explicitly
                if (!isNew)
                {
                    await _activityLogger.LogAsync("changed SMTP password for", "System Settings", settings.SmtpHost);
                }
            }

            settings.UpdatedAt = DateTimeHelper.GetIndianTime();

            await _db.SaveChangesAsync();

            // LOG: Admin saved email settings (general update)
            string action = isNew ? "created email settings" :
                (oldSmtpHost != settings.SmtpHost ? "updated email settings (host changed)" : "updated email settings");

            await _activityLogger.LogAsync(action, "System Settings", settings.SmtpHost);

            return Ok(new { message = "Email settings saved successfully" });
        }

        [HttpPost("emailsettings/test")]
        public async Task<IActionResult> Test([FromBody] string toEmail)
        {
            try
            {
                var sender = HttpContext.RequestServices.GetRequiredService<IEmailSender>();
                await sender.SendEmailAsync(toEmail, "Test Email", "This is a test email", "<p>This is a <b>test email</b></p>");

                // LOG: Admin sent test email
                await _activityLogger.LogAsync("sent test email to", "System Settings", toEmail);

                return Ok(new { message = "Test email sent" });
            }
            catch (Exception ex)
            {
                // LOG: Admin failed to send test email
                await _activityLogger.LogAsync("failed to send test email to", "System Settings", toEmail);
                return StatusCode(500, new { message = $"Failed to send test email: {ex.Message}" });
            }
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
                    AddonTermsAndConditions = "",
                    ShowGst = true,
                    ShowBankDetails = true,
                    ShowWebsite = false,
                    ShowSignature = true,
                    ShowTermsAndConditions = true,
                    ShowAddonTermsAndConditions = true,
                    Columns = new List<InvoiceColumnDto>
                    {
                        new InvoiceColumnDto { ColumnKey = "srno", ColumnName = "SL NO", IsVisible = true, Order = 0 },
                        new InvoiceColumnDto { ColumnKey = "details", ColumnName = "DESCRIPTION", IsVisible = true, Order = 1 },
                        new InvoiceColumnDto { ColumnKey = "rate", ColumnName = "RATE", IsVisible = true, Order = 2 },
                        new InvoiceColumnDto { ColumnKey = "quantity", ColumnName = "QUANTITY", IsVisible = true, Order = 3 },
                        new InvoiceColumnDto { ColumnKey = "amount", ColumnName = "AMOUNT", IsVisible = true, Order = 4 },
                    }
                };
                // LOG: Admin viewed invoice settings (optional read log, often skipped)
                await _activityLogger.LogAsync("viewed", "Invoice Settings", "retrieved");
                return Ok(emptyDto);
            }

            var dto = new InvoiceSettingsDto
            {
                CompanyLogoPath = !string.IsNullOrEmpty(settings.CompanyLogoPath)
                    ? $"{baseUrl}{settings.CompanyLogoPath}"
                    : "",
                OwnerSignaturePath = !string.IsNullOrEmpty(settings.OwnerSignaturePath)
                    ? $"{baseUrl}{settings.OwnerSignaturePath}"
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
                AddonTermsAndConditions = settings.AddonTermsAndConditions,
                ShowGst = settings.ShowGst,
                ShowBankDetails = settings.ShowBankDetails,
                ShowWebsite = settings.ShowWebsite,
                ShowSignature = settings.ShowSignature,
                ShowTermsAndConditions = settings.ShowTermsAndConditions,
                ShowAddonTermsAndConditions = settings.ShowAddonTermsAndConditions,
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

            // LOG: Admin viewed invoice settings
            await _activityLogger.LogAsync("viewed", "Invoice Settings", settings.CompanyName);
            return Ok(dto);
        }

        [HttpPost("invoicesettings/save")]
        public async Task<IActionResult> SaveInvoiceSettings([FromBody] InvoiceSettingsDto dto)
        {
            if (dto == null) return BadRequest("DTO is required.");

            var settings = await _db.CompanyInvoiceSettings
                .Include(s => s.Columns)
                .FirstOrDefaultAsync();

            bool isNew = (settings == null);

            if (isNew)
            {
                settings = new CompanyInvoiceSetting();
                _db.CompanyInvoiceSettings.Add(settings);
            }

            // Capture data before mapping for logging significance
            var oldIgst = settings?.IgstPercent;
            var oldCompanyName = settings?.CompanyName;

            string GetRelativePath(string fullPath, HttpRequest request)
            {
                if (string.IsNullOrEmpty(fullPath)) return string.Empty;
                var baseUrl = $"{request.Scheme}://{request.Host}";

                if (fullPath.StartsWith(baseUrl))
                {
                    var relativePath = fullPath.Substring(baseUrl.Length);
                    // Ensure it starts with a slash if it was trimmed
                    return relativePath.StartsWith("/") ? relativePath : $"/{relativePath}";
                }

                // If it already looks like a relative path (starts with /), return as is.
                if (fullPath.StartsWith("/"))
                {
                    return fullPath;
                }

                // This handles cases where the DTO path is already the relative path 
                // (e.g., if the frontend sends the result of the upload endpoint directly)
                return fullPath;
            }

            // Map paths, ensuring only the relative path is saved
            settings.CompanyLogoPath = GetRelativePath(dto.CompanyLogoPath, Request);
            settings.OwnerSignaturePath = GetRelativePath(dto.OwnerSignaturePath, Request);
            // ----------------------------

            // Map simple fields
            settings.CompanyName = dto.CompanyName;
            settings.CompanyAddress = dto.CompanyAddress;
            settings.CompanyPhone = dto.CompanyPhone;
            settings.CompanyEmail = dto.CompanyEmail;
            settings.CompanyWebsite = dto.CompanyWebsite;
            settings.GstNumber = dto.GstNumber;
            settings.OwnerName = dto.OwnerName;
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
            settings.AddonTermsAndConditions = dto.AddonTermsAndConditions;
            settings.ShowGst = dto.ShowGst;
            settings.ShowBankDetails = dto.ShowBankDetails;
            settings.ShowWebsite = dto.ShowWebsite;
            settings.ShowSignature = dto.ShowSignature;
            settings.ShowTermsAndConditions = dto.ShowTermsAndConditions;
            settings.ShowAddonTermsAndConditions = dto.ShowAddonTermsAndConditions;
            settings.UpdatedAt = DateTimeHelper.GetIndianTime();

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

            // Determine log action
            string action;
            if (isNew)
            {
                action = "created new";
            }
            else if (oldIgst != settings.IgstPercent)
            {
                action = $"updated tax rate (IGST changed to {settings.IgstPercent}%) on";
            }
            else
            {
                action = "updated general";
            }

            // LOG: Admin saved invoice settings
            await _activityLogger.LogAsync(action, "Invoice Settings", settings.CompanyName);

            return Ok(new { message = "Invoice settings saved successfully" });
        }

        // Helper: Save files and return relative URLs
        private async Task<List<string>> SaveFiles(IFormFileCollection files, HttpRequest request)
        {
            var urls = new List<string>();
            foreach (var file in files ?? new FormFileCollection())
            {
                if (file.Length > 5 * 1024 * 1024) continue;  // Skip if > 5MB
                var allowedTypes = new[] { "image/jpeg", "image/png", "image/svg+xml" };
                if (!allowedTypes.Contains(file.ContentType)) continue;
                var fileName = $"{Guid.NewGuid()}_{file.FileName}";
                var filePath = Path.Combine(_uploadsFolder, fileName);
                Directory.CreateDirectory(_uploadsFolder);  // Ensure folder exists
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }
                urls.Add($"/uploads/invoice/{fileName}");
            }
            return urls;
        }


        [HttpPost("invoicesettings/upload-image")]
        public async Task<IActionResult> UploadImage(IFormFile file, [FromQuery] string type)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded");

            // Use SaveFiles to handle the upload
            var files = new FormFileCollection { file };
            var relativePaths = await SaveFiles(files, Request);

            if (!relativePaths.Any())
            {
                // LOG: Failed image upload
                await _activityLogger.LogAsync($"failed to upload invoice image ({type})", "System Settings", "Invoice Image");
                return BadRequest("File upload failed (invalid type or size)");
            }

            var relativePath = relativePaths.First();  // Get the relative path
            var baseUrl = $"{Request.Scheme}://{Request.Host}";  // Ensure HTTPS
            var publicUrl = $"{baseUrl}{relativePath}";  // Full URL for response

            // Save relative path to DB
            var settings = await _db.CompanyInvoiceSettings.FirstOrDefaultAsync();
            if (settings == null)
            {
                settings = new CompanyInvoiceSetting();
                _db.CompanyInvoiceSettings.Add(settings);
            }

            // Determine log action before saving
            string logAction = (type == "logo") ? "uploaded company logo" : "uploaded owner signature";

            if (type == "logo")
                settings.CompanyLogoPath = relativePath;
            else if (type == "signature")
                settings.OwnerSignaturePath = relativePath;

            await _db.SaveChangesAsync();

            // LOG: Admin uploaded image
            await _activityLogger.LogAsync(logAction, "Invoice Settings", "Image");

            return Ok(new { path = publicUrl });
        }


        [HttpPost("transfer-modules")]
        public async Task<IActionResult> TransferModules([FromBody] TransferModulesRequest request)
        {
            if (string.IsNullOrEmpty(request.SourceUserId) ||
                string.IsNullOrEmpty(request.TargetUserId) ||
                request.ModuleIds == null || request.ModuleIds.Count == 0)
            {
                return BadRequest(new { success = false, message = "Invalid input" });
            }

            var sourceUser = await _userManager.FindByIdAsync(request.SourceUserId);
            var targetUser = await _userManager.FindByIdAsync(request.TargetUserId);
            var sourceName = sourceUser?.CompanyName ?? "Unknown";
            var targetName = targetUser?.CompanyName ?? "Unknown";

            try
            {
                // Load source modules
                var sourceModules = new List<UserQuery>();
                foreach (var id in request.ModuleIds)
                {
                    var module = await _db.UserQueries.FirstOrDefaultAsync(q => q.AppUserId == request.SourceUserId && q.UserQueryId == id);
                    if (module != null) sourceModules.Add(module);
                }

                // Load target modules
                var targetModules = await _db.UserQueries
                    .Where(q => q.AppUserId == request.TargetUserId)
                    .ToListAsync();

                var duplicates = new List<UserQuery>();
                var copied = new List<UserQuery>();

                // Find duplicates + items that will increase usage
                var modulesThatWillIncreaseCount = new List<UserQuery>();

                foreach (var sm in sourceModules)
                {
                    var existing = targetModules.FirstOrDefault(tm =>
                        tm.UserTitle == sm.UserTitle && tm.UserQueryText == sm.UserQueryText);

                    if (existing != null)
                    {
                        duplicates.Add(existing);

                        if (request.Action == "replace")
                        {
                            continue; // replaced items do not increase count
                        }
                        else if (request.Action == "ignore")
                        {
                            continue;
                        }
                        else if (request.Action == "cancel" || request.Action == "check")
                        {
                            continue;
                        }
                    }
                    else
                    {
                        modulesThatWillIncreaseCount.Add(sm);
                    }
                }

                // Load limit info
                var usage = await GetUserModuleUsage(request.TargetUserId);    // (used, remaining)
                var limits = await GetLimitsInternal(request.TargetUserId);   // (dashboardLimit, refreshMinutes, excelExport)

                int dashboardLimit = limits.dashboardLimit;
                int used = usage.used;
                int potentialAdds = modulesThatWillIncreaseCount.Count;

                // --------------------------------------------------------------------
                // CHECK MODE — MUST NEVER RETURN BadRequest
                // --------------------------------------------------------------------
                if (request.Action == "check")
                {
                    if (duplicates.Any())
                    {
                        await _activityLogger.LogAsync("checked module transfer (duplicates found) from", "User", sourceName, targetName);

                        return Ok(new
                        {
                            success = false,
                            duplicates = duplicates.Select(d => new { d.UserQueryId, d.UserTitle }),
                            capacityOk = (used + potentialAdds) <= dashboardLimit,
                            dashboardLimit,
                            used,
                            potentialAdds
                        });
                    }

                    // No duplicates — check capacity
                    bool capacityOk = (used + potentialAdds) <= dashboardLimit;

                    if (!capacityOk)
                    {
                        // STILL return 200 OK (never 400)
                        return Ok(new
                        {
                            success = false,
                            duplicates = new List<object>(),
                            capacityOk = false,
                            dashboardLimit,
                            used,
                            potentialAdds
                        });
                    }

                    // Auto-transfer all
                    foreach (var sm in sourceModules)
                    {
                        var newQuery = new UserQuery
                        {
                            AppUserId = request.TargetUserId,
                            UserTitle = sm.UserTitle,
                            UserQueryText = sm.UserQueryText,
                            VisualizationType = sm.VisualizationType,
                            UserQueryCreatedAtTime = DateTimeHelper.GetIndianTime(),
                            UserQueryLastUpdated = DateTimeHelper.GetIndianTime(),
                            UserIpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
                        };

                        _db.UserQueries.Add(newQuery);
                        copied.Add(newQuery);
                    }

                    await _db.SaveChangesAsync();

                    await _activityLogger.LogAsync("checked module transfer (no duplicates) from", "User", sourceName, targetName);

                    return Ok(new
                    {
                        success = true,
                        message = $"{copied.Count} modules transferred successfully (no duplicates found)."
                    });
                }

                // --------------------------------------------------------------------
                // CANCEL MODE
                // --------------------------------------------------------------------
                if (request.Action == "cancel")
                {
                    return Ok(new { success = true, message = "Transfer cancelled." });
                }

                int netVisibleIncrease = 0;

                if (request.Action == "replace" && duplicates.Any())
                {
                    // Case 1: Duplicates are being replaced.
                    int visibleDuplicatesReplaced = duplicates.Count(d => d.HideQuery == false);
                    int hiddenDuplicatesReplaced = duplicates.Count(d => d.HideQuery == true);

                    netVisibleIncrease = potentialAdds + duplicates.Count(d => d.HideQuery == true);
                }
                else
                {
                    // Case 2: Ignore or Standard transfer (only non-duplicates added)
                    netVisibleIncrease = potentialAdds;
                }

                // --- Enforce the FINAL Capacity Check ---
                if (used + netVisibleIncrease > dashboardLimit)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = $"Transfer blocked. Target user will exceed module limit ({dashboardLimit}). The operation attempts to add {netVisibleIncrease} new visible modules."
                    });
                }

                // --- FIX 2: Atomic Replacement ---
                // If replacing, remove the old module before adding the new one in the database context, 
                // so the changes are saved atomically.
                if (request.Action == "replace" && duplicates.Any())
                {
                    foreach (var d in duplicates)
                        _db.UserQueries.Remove(d);
                }

                // Add modules (This loop handles both non-duplicates and the replacements)
                foreach (var sm in sourceModules)
                {
                    var existing = targetModules.FirstOrDefault(tm =>
                        tm.UserTitle == sm.UserTitle && tm.UserQueryText == sm.UserQueryText);

                    if (existing != null)
                    {
                        if (request.Action == "ignore") continue;
                        if (request.Action == "cancel" || request.Action == "check") continue;
                        // If request.Action == "replace", the old one was marked for removal above, so we proceed to add the new one below.
                    }

                    var newQuery = new UserQuery
                    {
                        AppUserId = request.TargetUserId,
                        UserTitle = sm.UserTitle,
                        UserQueryText = sm.UserQueryText,
                        VisualizationType = sm.VisualizationType,
                        UserQueryCreatedAtTime = DateTimeHelper.GetIndianTime(),
                        UserQueryLastUpdated = DateTimeHelper.GetIndianTime(),
                        UserIpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                        HideQuery = false // Modules added by admin transfer are generally visible unless explicitly limited
                    };

                    _db.UserQueries.Add(newQuery);
                    copied.Add(newQuery);
                }

                await _db.SaveChangesAsync();

                string logAction = request.Action switch
                {
                    "replace" => $"transferred/replaced {copied.Count} modules from",
                    "ignore" => $"transferred {copied.Count} modules (ignored {duplicates.Count} duplicates) from",
                    _ => $"transferred {copied.Count} modules from"
                };

                await _activityLogger.LogAsync(logAction, "User", sourceName, targetName);

                return Ok(new
                {
                    success = true,
                    message = request.Action switch
                    {
                        "replace" => $"{copied.Count} modules transferred and duplicates replaced.",
                        "ignore" => $"{copied.Count} modules transferred, duplicates ignored.",
                        _ => $"{copied.Count} modules transferred successfully."
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in TransferModules: {Message}", ex.Message);
                await _activityLogger.LogAsync("failed module transfer from", "User", sourceName, targetName);

                return StatusCode(500, new { success = false, message = "An error occurred while transferring modules. Please try again." });
            }
        }

        public class TransferModulesRequest
        {
            public string SourceUserId { get; set; }
            public string TargetUserId { get; set; }
            public List<int> ModuleIds { get; set; }
            public string Action { get; set; } = "check"; // check, replace, ignore, cancel
        }

        public class ModuleSuggestionDto
        {
            public int Id { get; set; }
            public string Suggestion { get; set; }
            public string Status { get; set; }
            public string AdminResponse { get; set; }
            public DateTime CreatedAt { get; set; }
            // Nested DTO for the user data you need
            public UserSummaryDto User { get; set; }
        }

        public class UserSummaryDto
        {
            public string Id { get; set; }
            public string CompanyName { get; set; }
            public string CustomerName { get; set; }
            public string Email { get; set; }
        }
        [HttpGet("module-suggestions")]
        public async Task<IActionResult> GetModuleSuggestions()
        {
            var suggestions = await _db.ModuleSuggestions
                .Include(s => s.AppUser)
                .OrderByDescending(s => s.CreatedAt)
                .Select(s => new ModuleSuggestionDto
                {
                    Id = s.Id,
                    Suggestion = s.SuggestionText,
                    Status = s.Status,
                    AdminResponse = s.AdminResponse,
                    CreatedAt = s.CreatedAt,
                    User = new UserSummaryDto
                    {
                        Id = s.AppUser.Id,
                        CompanyName = s.AppUser.CompanyName,
                        CustomerName = s.AppUser.CustomerName,
                        Email = s.AppUser.UserName
                    }
                })
                .ToListAsync();

            return Ok(suggestions);
        }

        [HttpGet("user/{userId}/suggestions")]
        public async Task<IActionResult> GetSuggestionsByUserId(string userId)
        {
            // The userId passed in the route (e.g., from /admin/user/123/suggestions) 
            // is captured by the parameter 'userId'.
            if (string.IsNullOrEmpty(userId))
            {
                return BadRequest("User ID is required.");
            }

            try
            {
                var suggestions = await _db.ModuleSuggestions
                    .Where(s => s.AppUserId == userId) // <-- THE KEY FILTERING STEP
                    .Include(s => s.AppUser)
                    .OrderByDescending(s => s.CreatedAt)
                    .ToListAsync();

                // Map the results to a DTO if you have one, or return the raw entities.
                // Assuming your frontend expects the raw structure from the previous method.
                return Ok(suggestions);
            }
            catch (Exception ex)
            {
                // Log the exception (recommended)
                return StatusCode(500, "Internal server error while fetching user suggestions.");
            }
        }

        public class AdminResponseDto
        {
            public string AdminResponse { get; set; } = string.Empty;
        }

        public class RejectSuggestionDto : AdminResponseDto
        {
            // Inherits AdminResponse. Status will be handled separately in the logic.
        }

        // 1. MarkCreated (Updated to accept optional AdminResponse)
        [HttpPost("mark-created/{id}")]
        public async Task<IActionResult> MarkCreated(int id, [FromBody] AdminResponseDto model)
        {
            var suggestion = await _db.ModuleSuggestions.FindAsync(id);
            if (suggestion == null) return NotFound();

            suggestion.Status = "Created";

            // Set the optional response
            suggestion.AdminResponse = model?.AdminResponse ?? string.Empty;

            // // Signal the user for the confirmation toast (Assuming AppUser has ModuleSuggestionCreatedToastSignal)
            // var user = await _db.AppUsers.FindAsync(suggestion.AppUserId);
            // if (user != null)
            // {
            //     user.ModuleSuggestionCreatedToastSignal = true;
            // }

            await _db.SaveChangesAsync();
            return Ok();
        }

        // 2. RejectSuggestion (NEW method)
        [HttpPost("reject-suggestion/{id}")]
        public async Task<IActionResult> RejectSuggestion(int id, [FromBody] RejectSuggestionDto model)
        {
            var suggestion = await _db.ModuleSuggestions.FindAsync(id);
            if (suggestion == null) return NotFound();

            if (string.IsNullOrWhiteSpace(model.AdminResponse))
            {
                // Require a reason for rejection
                return BadRequest(new { message = "Rejection reason (AdminResponse) is required." });
            }

            suggestion.Status = "Rejected"; // Hardcoded status change
            suggestion.AdminResponse = model.AdminResponse.Trim();

            // // Find the associated user and clear the toast signal, just in case
            // var user = await _db.AppUsers.FindAsync(suggestion.AppUserId);
            // if (user != null)
            // {
            //     user.ModuleSuggestionCreatedToastSignal = false;
            // }

            await _db.SaveChangesAsync();

            return Ok(new { message = "Suggestion rejected successfully and user response saved." });
        }

    }


    // 🔹 DTO for profile input/output
    public class UserProfileDto
    {
        public string? ProfilePhotoUrl { get; set; }
        public string? CompanyLogoUrl { get; set; }
        public string CompanyName { get; set; }
        public string? ShortName { get; set; }
        public string? Email { get; set; }
        public string CustomerName { get; set; } = "";
        public string CustomerGST { get; set; } = "";
        public string CustomerCode { get; set; } = "";
        public string? PhoneNumber { get; set; }
        public string ServerName { get; set; }
        public string DatabaseName { get; set; }
        public string DbUsername { get; set; }
        public string DbPassword { get; set; }

    }
}
