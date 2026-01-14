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
using System.Net;
using System.Linq;
using System.Threading.Tasks;

namespace minutechart.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProcurementsController : ControllerBase
    {
        private readonly MinutechartDbContext _db;
        private readonly ILogger<DatabaseService> _logger;
        private readonly UserManager<AppUser> _userManager;
        private readonly IConfiguration _configuration;
        private readonly DatabaseService _dbService;
        private readonly IEmailSender _emailSender;
        private readonly ActivityLogger _activityLogger;

        private readonly string _uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "invoice");

        public ProcurementsController(MinutechartDbContext db, UserManager<AppUser> userManager, DatabaseService dbService, IConfiguration configuration, IEmailSender emailSender, ILogger<DatabaseService> logger, ActivityLogger activityLogger)
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

        [HttpGet("purchase-orders/user/{id}/queries")]
        public async Task<IActionResult> GetProcurementsPurchaseOrdersQuery(string id)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null)
                return NotFound(new { message = "User not found" });

            bool isAnyAdmin = User.IsInRole("Admin") || User.IsInRole("SuperAdmin");

            var queriesQuery = _db.ProcurementsPurchaseOrders
                .Where(q => q.AppUserId == user.Id);


            var queries = await queriesQuery
                .OrderByDescending(q => q.QueryLastUpdated)
                .ToListAsync();

            // LOG: Admin viewed user's modules
            await _activityLogger.LogAsync("viewed modules for", "User", user.UserName ?? user.Email);

            return Ok(queries);
        }

        [HttpDelete("purchase-orders/delete-query/{id}")]
        public async Task<IActionResult> DeleteProcurementsPurchaseOrdersQuery(int id)
        {
            var query = await _db.ProcurementsPurchaseOrders
                .Include(q => q.AppUser) // Include user for logging target name
                .FirstOrDefaultAsync(q => q.Id == id);

            if (query == null) return NotFound();

            var targetUserName = query.AppUser?.UserName ?? query.AppUser?.Email ?? "N/A";
            var queryTitle = query.Title;

            _db.ProcurementsPurchaseOrders.Remove(query);
            await _db.SaveChangesAsync();

            // LOG: Admin deleted a module
            await _activityLogger.LogAsync("deleted module", "Module", queryTitle, targetUserName);

            return Ok(new { success = true, message = "Module deleted successfully" });
        }

        [HttpPost("purchase-orders/execute-user-query/{userId}")]
        public async Task<IActionResult> ExecuteProcurementsPurchaseOrdersQuery(string userId, [FromBody] ExecuteQueryRequest req)
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
                    string sql = req.QueryText.Trim();

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
            public string QueryText { get; set; }
        }

        public class SaveUserQueryRequest
        {
            public int Id { get; set; }
            public string Title { get; set; }
            public string QueryText { get; set; }
            public string VisualizationType { get; set; }
            public string? PrimaryKeyColumn { get; set; }
            public string? InsertQuery { get; set; }
            public string? UpdateQuery { get; set; }
        }

        [HttpPost("purchase-orders/save-user-query/{userId}")]
        public async Task<IActionResult> SaveProcurementsPurchaseOrdersQuery(string userId, [FromBody] SaveUserQueryRequest req)
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
                    var sql = SQLShortNameHelper.InjectShortName(req.QueryText, profile.ShortName);
                    cmd.CommandText = sql;
                    var reader = await cmd.ExecuteReaderAsync();
                    await reader.CloseAsync();
                }

                ProcurementsPurchaseOrder userQuery;
                string action;

                if (req.Id != 0) // update existing
                {
                    userQuery = await _db.ProcurementsPurchaseOrders.FirstOrDefaultAsync(q => q.Id == req.Id && q.AppUserId == userId);
                    if (userQuery == null)
                        return NotFound(new { success = false, message = "Module not found" });

                    // Capture old title for logging if it changed
                    var oldTitle = userQuery.Title;

                    // ... (Update fields logic remains) ...
                    userQuery.Title = req.Title;
                    userQuery.QueryText = req.QueryText;
                    userQuery.VisualizationType = req.VisualizationType;
                    userQuery.PrimaryKeyColumn = req.PrimaryKeyColumn;
                    userQuery.InsertQuery = req.InsertQuery;
                    userQuery.UpdateQuery = req.UpdateQuery;
                    userQuery.QueryLastUpdated = DateTimeHelper.GetIndianTime();

                    _db.ProcurementsPurchaseOrders.Update(userQuery);
                    action = "updated module";
                }
                else // create new
                {

                    userQuery = new ProcurementsPurchaseOrder
                    {
                        AppUserId = userId,
                        UserIpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                        Title = req.Title,
                        QueryText = req.QueryText,
                        VisualizationType = req.VisualizationType,
                        PrimaryKeyColumn = req.PrimaryKeyColumn,
                        InsertQuery = req.InsertQuery,
                        UpdateQuery = req.UpdateQuery,

                        QueryCreatedAtTime = DateTimeHelper.GetIndianTime(),
                        QueryLastUpdated = DateTimeHelper.GetIndianTime()
                    };

                    _db.ProcurementsPurchaseOrders.Add(userQuery);
                    action = "created new module";
                }

                await _db.SaveChangesAsync();

                // LOG: Admin saved/updated a module for a user
                await _activityLogger.LogAsync(action, "Module", req.Title, targetUserName);

                return Ok(new
                {
                    success = true,
                    message = "Query saved successfully",
                    query = new
                    {
                        Id = userQuery.Id,
                        Title = userQuery.Title,
                        VisualizationType = userQuery.VisualizationType
                    }
                });
            }
            catch (Exception ex)
            {
                // LOG: Failed to save/update module
                await _activityLogger.LogAsync("failed to save module", "Module", req.Title, targetUserName);
                return BadRequest(new { success = false, message = $"Query validation failed: {ex.Message}" });
            }
        }


        // ✅ Run a saved query for a user
        [HttpGet("purchase-orders/run-saved-query/{userId}/{queryId}")]
        public async Task<IActionResult> RunProcurementsPurchaseOrdersSavedQuery(string userId, int queryId)
        {
            var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == userId);
            if (profile == null)
                return BadRequest(new { success = false, message = "User profile not found" });

            var query = await _db.ProcurementsPurchaseOrders.FirstOrDefaultAsync(q => q.Id == queryId && q.AppUserId == userId);
            if (query == null)
                return NotFound(new { success = false, message = "Query not found" });

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            var targetUserName = user?.UserName ?? user?.Email ?? userId;

            try
            {
                using (var connection = await _dbService.CreateClientConnectionAsync(profile))
                {
                    var cmd = connection.CreateCommand();
                    var sql = SQLShortNameHelper.InjectShortName(query.QueryText, profile.ShortName);
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

                    // LOG: Admin ran a saved query
                    await _activityLogger.LogAsync("ran saved query", "Query", query.Title, targetUserName);

                    return Ok(new { success = true, data = table });
                }
            }
            catch (Exception ex)
            {
                // LOG: Failed to run saved query
                await _activityLogger.LogAsync("failed to run saved query", "Query", query.Title, targetUserName);
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("purchase-orders/transfer-modules")]
        public async Task<IActionResult> TransferProcurementsPurchaseOrdersModules([FromBody] TransferModulesRequest request)
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
                var sourceModules = new List<ProcurementsPurchaseOrder>();
                foreach (var id in request.ModuleIds)
                {
                    var module = await _db.ProcurementsPurchaseOrders.FirstOrDefaultAsync(q => q.AppUserId == request.SourceUserId && q.Id == id);
                    if (module != null) sourceModules.Add(module);
                }

                // Load target modules
                var targetModules = await _db.ProcurementsPurchaseOrders
                    .Where(q => q.AppUserId == request.TargetUserId)
                    .ToListAsync();

                var duplicates = new List<ProcurementsPurchaseOrder>();
                var copied = new List<ProcurementsPurchaseOrder>();

                // Find duplicates + items that will increase usage
                var modulesThatWillIncreaseCount = new List<ProcurementsPurchaseOrder>();

                foreach (var sm in sourceModules)
                {
                    var existing = targetModules.FirstOrDefault(tm =>
                        tm.Title == sm.Title && tm.QueryText == sm.QueryText);

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
                            duplicates = duplicates.Select(d => new { d.Id, d.Title })
                        });
                    }

                    // Auto-transfer all
                    foreach (var sm in sourceModules)
                    {
                        var newQuery = new ProcurementsPurchaseOrder
                        {
                            AppUserId = request.TargetUserId,
                            Title = sm.Title,
                            QueryText = sm.QueryText,
                            VisualizationType = sm.VisualizationType,
                            QueryCreatedAtTime = DateTimeHelper.GetIndianTime(),
                            QueryLastUpdated = DateTimeHelper.GetIndianTime(),
                            UserIpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
                        };

                        _db.ProcurementsPurchaseOrders.Add(newQuery);
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

                // --- FIX 2: Atomic Replacement ---
                // If replacing, remove the old module before adding the new one in the database context, 
                // so the changes are saved atomically.
                if (request.Action == "replace" && duplicates.Any())
                {
                    foreach (var d in duplicates)
                        _db.ProcurementsPurchaseOrders.Remove(d);
                }

                // Add modules (This loop handles both non-duplicates and the replacements)
                foreach (var sm in sourceModules)
                {
                    var existing = targetModules.FirstOrDefault(tm =>
                        tm.Title == sm.Title && tm.QueryText == sm.QueryText);

                    if (existing != null)
                    {
                        if (request.Action == "ignore") continue;
                        if (request.Action == "cancel" || request.Action == "check") continue;
                        // If request.Action == "replace", the old one was marked for removal above, so we proceed to add the new one below.
                    }

                    var newQuery = new ProcurementsPurchaseOrder
                    {
                        AppUserId = request.TargetUserId,
                        Title = sm.Title,
                        QueryText = sm.QueryText,
                        VisualizationType = sm.VisualizationType,
                        QueryCreatedAtTime = DateTimeHelper.GetIndianTime(),
                        QueryLastUpdated = DateTimeHelper.GetIndianTime(),
                        UserIpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
                    };

                    _db.ProcurementsPurchaseOrders.Add(newQuery);
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

        private static HashSet<string> ExtractSqlParameters(string sql)
        {
            var matches = System.Text.RegularExpressions.Regex.Matches(sql, @"@\w+");
            return matches
                .Select(m => m.Value.TrimStart('@'))
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
        }

        private static string GetFinancialYearSuffix(DateTime date)
        {
            // FY starts from April
            return date.Month >= 4
                ? (date.Year + 1).ToString().Substring(2)
                : date.Year.ToString().Substring(2);
        }

        private static int ExtractRunningNumber(string poNo)
        {
            // PRCH/000209/26
            if (string.IsNullOrWhiteSpace(poNo)) return 0;

            var parts = poNo.Split('/');
            if (parts.Length != 3) return 0;

            return int.TryParse(parts[1], out var num) ? num : 0;
        }

        public class GeneratePoRequest
        {
            public DateTime PODate { get; set; }
        }

        // // middle number refreshes on year changes
        //         [HttpPost("purchase-orders/generate-po-number/{userId}")]
        //         public async Task<IActionResult> GeneratePurchaseOrderNumber(
        //             string userId,
        //             [FromBody] GeneratePoRequest request)
        //         {
        //             var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == userId);
        //             if (profile == null)
        //                 return BadRequest(new { success = false, message = "User profile not found" });

        //             var poDate = request.PODate.Date;
        //             var fySuffix = GetFinancialYearSuffix(poDate);
        //             const string prefix = "PRCH";

        //             try
        //             {
        //                 using var connection = await _dbService.CreateClientConnectionAsync(profile);
        //                 using var transaction = connection.BeginTransaction();

        //                 var cmd = connection.CreateCommand();
        //                 cmd.Transaction = transaction;
        //                 // 🔒 UPDLOCK + HOLDLOCK prevents duplicate numbers
        //                 cmd.CommandText = @"
        //             SELECT TOP 1 Po_No
        //             FROM Pur_Ord_Mst WITH (UPDLOCK, HOLDLOCK)
        //             WHERE Po_No LIKE @prefixPattern
        //             ORDER BY
        //     CAST(
        //         SUBSTRING(
        //             Po_No,
        //             CHARINDEX('/', Po_No) + 1,
        //             CHARINDEX('/', Po_No, CHARINDEX('/', Po_No) + 1)
        //             - CHARINDEX('/', Po_No) - 1
        //         ) AS INT
        //     ) DESC";

        //                 cmd.Parameters.AddWithValue(
        //                     "@prefixPattern",
        //                     $"{prefix}/%/{fySuffix}"
        //                 );

        //                 var lastPoObj = await cmd.ExecuteScalarAsync();
        //                 var lastPo = lastPoObj?.ToString();

        //                 int nextNumber = string.IsNullOrEmpty(lastPo)
        //                     ? 1
        //                     : ExtractRunningNumber(lastPo) + 1;

        //                 var newPoNo = $"{prefix}/{nextNumber:D6}/{fySuffix}";

        //                 transaction.Commit();

        //                 return Ok(new
        //                 {
        //                     success = true,
        //                     poNumber = newPoNo,
        //                     financialYear = fySuffix
        //                 });
        //             }
        //             catch (Exception ex)
        //             {
        //                 _logger.LogError(ex, "Failed to generate PO number");
        //                 return StatusCode(500, new
        //                 {
        //                     success = false,
        //                     message = "Failed to generate PO number"
        //                 });
        //             }
        //         }

        // middle numbers continues on year changes
        [HttpPost("purchase-orders/generate-po-number/{userId}")]
        public async Task<IActionResult> GeneratePurchaseOrderNumber(
            string userId,
            [FromBody] GeneratePoRequest request)
        {
            var profile = await _db.UserProfiles
                .FirstOrDefaultAsync(p => p.AppUserId == userId);

            if (profile == null)
                return BadRequest(new { success = false, message = "User profile not found" });

            var poDate = request.PODate.Date;
            var fySuffix = GetFinancialYearSuffix(poDate);
            const string prefix = "PRCH";

            try
            {
                using var connection = await _dbService.CreateClientConnectionAsync(profile);
                using var transaction = connection.BeginTransaction();

                var cmd = connection.CreateCommand();
                cmd.Transaction = transaction;

                // 🔒 Lock + get last PO across ALL years
                cmd.CommandText = @"
            SELECT TOP 1 Po_No
            FROM Pur_Ord_Mst WITH (UPDLOCK, HOLDLOCK)
            WHERE Po_No LIKE @prefixOnly
            ORDER BY
                CAST(
                    SUBSTRING(
                        Po_No,
                        CHARINDEX('/', Po_No) + 1,
                        CHARINDEX('/', Po_No, CHARINDEX('/', Po_No) + 1)
                        - CHARINDEX('/', Po_No) - 1
                    ) AS INT
                ) DESC";

                cmd.Parameters.AddWithValue("@prefixOnly", $"{prefix}/%");

                var lastPoObj = await cmd.ExecuteScalarAsync();
                var lastPo = lastPoObj?.ToString();

                int nextNumber = string.IsNullOrEmpty(lastPo)
                    ? 1
                    : ExtractRunningNumber(lastPo) + 1;

                var newPoNo = $"{prefix}/{nextNumber:D6}/{fySuffix}";

                transaction.Commit();

                return Ok(new
                {
                    success = true,
                    poNumber = newPoNo,
                    financialYear = fySuffix
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate PO number");

                return StatusCode(500, new
                {
                    success = false,
                    message = "Failed to generate PO number"
                });
            }
        }


        [HttpGet("purchase-orders/parties/{userId}")]
        public async Task<IActionResult> GetParties(string userId)
        {
            var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == userId);
            if (profile == null) return BadRequest("Profile not found");

            using var conn = await _dbService.CreateClientConnectionAsync(profile);
            using var cmd = conn.CreateCommand();

            cmd.CommandText = @"
                SELECT 
                    P_Code,
                    P_Name,
                    P_GST_IN,
                    P_GST_REGADD
                FROM PartyMst
            ";

            var list = new List<object>();
            using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                list.Add(new
                {
                    code = reader["P_Code"],
                    name = reader["P_Name"],
                    gst = reader["P_GST_IN"],
                    add = reader["P_GST_REGADD"]
                });
            }

            return Ok(list);
        }

        [HttpGet("purchase-orders/stores/{userId}")]
        public async Task<IActionResult> GetStores(string userId)
        {
            var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == userId);
            if (profile == null) return BadRequest("Profile not found");

            using var conn = await _dbService.CreateClientConnectionAsync(profile);
            using var cmd = conn.CreateCommand();

            cmd.CommandText = @"
                SELECT 
                    Str_Code,
                    Str_Name,
                    Loc_Code,
                    STR_SERIES
                FROM StoreMst
            ";

            var list = new List<object>();
            using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                list.Add(new
                {
                    code = reader["Str_Code"],
                    name = reader["Str_Name"],
                    loccode = reader["Loc_Code"],
                    series = reader["STR_SERIES"]
                });
            }

            return Ok(list);
        }

        [HttpGet("purchase-orders/agents/{userId}")]
        public async Task<IActionResult> GetAgents(string userId)
        {
            var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == userId);
            if (profile == null) return BadRequest("Profile not found");

            using var conn = await _dbService.CreateClientConnectionAsync(profile);
            using var cmd = conn.CreateCommand();

            cmd.CommandText = "SELECT Br_Code, Br_Name FROM BrokerMst ORDER BY Br_Name";

            var list = new List<object>();
            using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                list.Add(new
                {
                    code = reader["Br_Code"],
                    name = reader["Br_Name"]
                });
            }

            return Ok(list);
        }

        [HttpGet("purchase-orders/items/{userId}")]
        public async Task<IActionResult> GetItems(string userId)
        {
            var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == userId);
            if (profile == null) return BadRequest("Profile not found");

            using var conn = await _dbService.CreateClientConnectionAsync(profile);
            using var cmd = conn.CreateCommand();

            cmd.CommandText = @"
                SELECT 
                    i.I_CODE,
                    i.I_NAME1,
                    i.I_UOM,
                    i.I_PRate,
                    u.Unit_Name
                FROM ItemMst i
                LEFT JOIN UnitMst u ON u.Unit_Code = i.I_UOM
                ORDER BY i.I_CODE
            ";

            var list = new List<object>();
            using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                list.Add(new
                {
                    code = reader["I_CODE"],
                    name = reader["I_NAME1"],
                    uomCode = reader["I_UOM"],
                    rate = reader["I_PRate"],
                    uomName = reader["Unit_Name"]
                });
            }

            return Ok(list);
        }

        [HttpGet("purchase-orders/departments/{userId}")]
        public async Task<IActionResult> GetDepartments(string userId)
        {
            var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == userId);
            if (profile == null) return BadRequest("Profile not found");

            using var conn = await _dbService.CreateClientConnectionAsync(profile);
            using var cmd = conn.CreateCommand();

            cmd.CommandText = @"
                SELECT 
                    Lab_Code,
                    Lab_Name
                FROM LabourMst
                ORDER BY Lab_Code
            ";

            var list = new List<object>();
            using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                list.Add(new
                {
                    code = reader["Lab_Code"],
                    name = reader["Lab_Name"]
                });
            }

            return Ok(list);
        }

        [HttpGet("purchase-orders/shades/{userId}")]
        public async Task<IActionResult> GetShades(string userId)
        {
            var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == userId);
            if (profile == null) return BadRequest("Profile not found");

            using var conn = await _dbService.CreateClientConnectionAsync(profile);
            using var cmd = conn.CreateCommand();

            cmd.CommandText = @"
                SELECT 
                    PShade_Code,
                    PShade_Cost
                FROM PKShade
            ";

            var list = new List<object>();
            using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                list.Add(new
                {
                    code = reader["PShade_Code"],
                    cost = reader["PShade_Cost"]
                });
            }

            return Ok(list);
        }

        [HttpGet("purchase-orders/costcenters/{userId}")]
        public async Task<IActionResult> GetCostCenters(string userId)
        {
            var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == userId);
            if (profile == null) return BadRequest("Profile not found");

            using var conn = await _dbService.CreateClientConnectionAsync(profile);
            using var cmd = conn.CreateCommand();

            cmd.CommandText = @"
                SELECT 
                    Kh_Code,
                    Kh_Name
                FROM KhataMst
                ORDER BY Kh_Code
            ";

            var list = new List<object>();
            using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                list.Add(new
                {
                    code = reader["Kh_Code"],
                    name = reader["Kh_Name"]
                });
            }

            return Ok(list);
        }

        // public class ItemSaveDto
        // {
        //     public string MainCode { get; set; }  // WIP_CODE
        //     public string MainName { get; set; }    // WIP_NAME
        //     public string? Mode { get; set; }   // WIP_MODE
        // }

        public static string NumberToWordsIndian(long number)
        {
            if (number == 0) return "Zero";

            string[] units = { "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
        "Eighteen", "Nineteen" };

            string[] tens = { "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety" };

            string words = "";

            if ((number / 100000) > 0)
            {
                words += NumberToWordsIndian(number / 100000) + " Lac ";
                number %= 100000;
            }

            if ((number / 1000) > 0)
            {
                words += NumberToWordsIndian(number / 1000) + " Thousand ";
                number %= 1000;
            }

            if ((number / 100) > 0)
            {
                words += NumberToWordsIndian(number / 100) + " Hundred ";
                number %= 100;
            }

            if (number > 0)
            {
                if (number < 20)
                    words += units[number];
                else
                    words += tens[number / 10] + " " + units[number % 10];
            }

            return words.Trim();
        }

        public class PurchaseOrderSaveDto
        {
            public PoHeaderDto Header { get; set; } = new();
            public List<PoItemDto> Items { get; set; } = new();
        }

        public class PoHeaderDto
        {
            public string Purchase_Number { get; set; } //Po_No
            public DateTime Purchase_Date { get; set; } //Po_Date
            public int? OrderMode { get; set; } // Dept_Code
            public string? Mode { get; set; } // PO_Mode
            public int? StoreName { get; set; } //P_Str_Code
            public int PartyName { get; set; } //P_Code
            public int? AgentName { get; set; } //POM_BrCode
            public string? Reference { get; set; } //Supp_Ref
            public DateTime? RefDate { get; set; } //RecDate
            public string Currency { get; set; } = "INR"; //Curr
            public int? CrDays { get; set; } //PO_CrDays
            public int? DelDays { get; set; } //POM_DELDays

            public string? DelTerms { get; set; } //DTerms
            public string? PayTerms { get; set; } //PTerms
            public string? DispatchIns { get; set; } //Disp_Ins
            public string? SpNote { get; set; } //Sp_Note
            public string? Remarks { get; set; } //Remark
            public decimal TotalItem { get; set; } //Tot_Itm
            public decimal TotalQty { get; set; } //Tot_Qty
            public decimal GrossAmount { get; set; } //Tot_Amt
            public decimal TotalDiscount { get; set; } //Tot_Disc
            public decimal TaxAmount { get; set; } //PF_Chg
            public decimal? Freight { get; set; } //Freights
            public decimal NetAmount { get; set; } //NetAmt

        }

        public class PoItemDto
        {
            public int SrNo { get; set; } //SrNo

            public string ItemCode { get; set; } //I_Code
            public string? IndCode { get; set; } //Ind_Code
            public string? Shade { get; set; } //SHADE
            public string? Remark { get; set; } //P_Remark
            public int? DepartmentName { get; set; } //DEP_CODE
            public int? CostCenterName { get; set; } //Kh_Code
            public int? UQC { get; set; } //UOM
            public decimal GRNQty { get; set; } //Qty
            public decimal Rate { get; set; } //Rate
            public decimal Disc { get; set; } //Disc
            public decimal Amount { get; set; } //Amount
            public decimal Freight { get; set; } //Freight
            public decimal CGPer { get; set; } //CGPer
            public decimal CGAmt { get; set; } //CGAmt
            public decimal SGPer { get; set; } //SGPer
            public decimal SGAmt { get; set; } //SGAmt
            public decimal IGPer { get; set; } //IGPer
            public decimal IGAmt { get; set; } //IGAmt
        }

        [HttpPost("purchase-orders/save/{userId}")]
        public async Task<IActionResult> SavePO(string userId, [FromBody] PurchaseOrderSaveDto dto)
        {
            var profile = await _db.UserProfiles
                .FirstOrDefaultAsync(p => p.AppUserId == userId);

            if (profile == null)
                return BadRequest("Profile not found");

            var netAmtRounded = (long)Math.Floor(dto.Header.NetAmount);
            var words = NumberToWordsIndian(netAmtRounded) + " Only";
            var cgPerAvg = dto.Items.Any() ? dto.Items.Average(i => i.CGPer) : 0;
            var cgAmtTotal = dto.Items.Sum(i => i.CGAmt);
            var sgPerAvg = dto.Items.Any() ? dto.Items.Average(i => i.SGPer) : 0;
            var sgAmtTotal = dto.Items.Sum(i => i.SGAmt);
            var igPerAvg = dto.Items.Any() ? dto.Items.Average(i => i.IGPer) : 0;
            var igAmtTotal = dto.Items.Sum(i => i.IGAmt);

            using var conn = await _dbService.CreateClientConnectionAsync(profile);
            using var tx = conn.BeginTransaction();

            try
            {
                // ================= INSERT HEADER =================
                using (var cmd = conn.CreateCommand())
                {
                    cmd.Transaction = tx;
                    cmd.CommandText = @"
                INSERT INTO Pur_Ord_Mst
                (
                    Po_No, Po_Date, Dept_Code, Po_Mode,
                    P_Code,
                    Tot_Itm, Tot_Qty, Tot_Disc,
                    Tot_Amt, PF_Chg, NetAmt, Words,
                    Freight, CGPer, CGAmt, SGPer, SGAmt, IGPer, IGAmt,
                    DTerms, PTerms, Disp_Ins, Sp_Note, Remark,
                    Supp_Ref, RecDate, Curr,
                    PO_CrDays, POM_DELDays,
                    P_Str_Code, POM_BrCode
                )
                VALUES
                (
                    @Po_No, @Po_Date, @Dept_Code, @Po_Mode,
                    @P_Code,
                    @Tot_Itm, @Tot_Qty, @Tot_Disc,
                    @Tot_Amt, @PF_Chg, @NetAmt, @Words,
                    @Freight, @CGPer, @CGAmt, @SGPer, @SGAmt, @IGPer, @IGAmt,
                    @DTerms, @PTerms, @Disp_Ins, @Sp_Note, @Remark,
                    @Supp_Ref, @RecDate, @Curr,
                    @PO_CrDays, @POM_DELDays,
                    @P_Str_Code, @POM_BrCode
                )";

                    cmd.Parameters.AddWithValue("@Po_No", dto.Header.Purchase_Number);
                    cmd.Parameters.AddWithValue("@Po_Date", dto.Header.Purchase_Date);
                    cmd.Parameters.AddWithValue("@Dept_Code", dto.Header.OrderMode);
                    cmd.Parameters.AddWithValue("@Po_Mode", (object?)dto.Header.Mode ?? DBNull.Value);

                    cmd.Parameters.AddWithValue("@P_Code", dto.Header.PartyName);

                    cmd.Parameters.AddWithValue("@Tot_Itm", dto.Header.TotalItem);
                    cmd.Parameters.AddWithValue("@Tot_Qty", dto.Header.TotalQty);
                    cmd.Parameters.AddWithValue("@Tot_Disc", dto.Header.TotalDiscount);
                    cmd.Parameters.AddWithValue("@Tot_Amt", dto.Header.GrossAmount);
                    cmd.Parameters.AddWithValue("@PF_Chg", dto.Header.TaxAmount);
                    cmd.Parameters.AddWithValue("@NetAmt", dto.Header.NetAmount);
                    cmd.Parameters.AddWithValue("@Words", words);
                    cmd.Parameters.AddWithValue("@CGPer", cgPerAvg);
                    cmd.Parameters.AddWithValue("@CGAmt", cgAmtTotal);
                    cmd.Parameters.AddWithValue("@SGPer", sgPerAvg);
                    cmd.Parameters.AddWithValue("@SGAmt", sgAmtTotal);
                    cmd.Parameters.AddWithValue("@IGPer", igPerAvg);
                    cmd.Parameters.AddWithValue("@IGAmt", igAmtTotal);

                    cmd.Parameters.AddWithValue("@Freight", (object?)dto.Header.Freight ?? DBNull.Value);

                    cmd.Parameters.AddWithValue("@DTerms", (object?)dto.Header.DelTerms ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@PTerms", (object?)dto.Header.PayTerms ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@Disp_Ins", (object?)dto.Header.DispatchIns ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@Sp_Note", (object?)dto.Header.SpNote ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@Remark", (object?)dto.Header.Remarks ?? DBNull.Value);

                    cmd.Parameters.AddWithValue("@Supp_Ref", (object?)dto.Header.Reference ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@RecDate", (object?)dto.Header.RefDate ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@Curr", dto.Header.Currency);

                    cmd.Parameters.AddWithValue("@PO_CrDays", (object?)dto.Header.CrDays ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@POM_DELDays", (object?)dto.Header.DelDays ?? DBNull.Value);

                    cmd.Parameters.AddWithValue("@P_Str_Code", dto.Header.StoreName);
                    cmd.Parameters.AddWithValue("@POM_BrCode", (object?)dto.Header.AgentName ?? DBNull.Value);

                    await cmd.ExecuteNonQueryAsync();
                }

                // ================= INSERT ITEMS =================
                foreach (var item in dto.Items)
                {
                    using var cmd = conn.CreateCommand();
                    cmd.Transaction = tx;

                    cmd.CommandText = @"
                INSERT INTO Pur_Ordr_Det
                (
                    po_no, SrNo,
                    I_Code, Ind_Code, UOM,
                    Qty,
                    Kh_Code, DEP_CODE,
                    SHADE, P_Remark,
                    Rate, Disc, Amount, Freight,
                    CGPer, SGPer, IGPer,
                    CGAmt, SGAmt, IGAmt
                )
                VALUES
                (
                    @po_no, @SrNo,
                    @I_Code,@Ind_Code, @UOM,
                    @Qty,
                    @Kh_Code, @DEP_CODE,
                    @SHADE, @P_Remark,
                    @Rate, @Disc, @Amount, @Freight,
                    @CGPer, @SGPer, @IGPer,
                    @CGAmt, @SGAmt, @IGAmt
                )";

                    cmd.Parameters.AddWithValue("@po_no", dto.Header.Purchase_Number);
                    cmd.Parameters.AddWithValue("@SrNo", item.SrNo);

                    cmd.Parameters.AddWithValue("@I_Code", item.ItemCode);
                    cmd.Parameters.AddWithValue("@Ind_Code", (object?)item.IndCode ?? "None");

                    cmd.Parameters.AddWithValue("@UOM", item.UQC);

                    cmd.Parameters.AddWithValue("@Qty", item.GRNQty);

                    cmd.Parameters.AddWithValue("@Kh_Code", (object?)item.CostCenterName ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@DEP_CODE", (object?)item.DepartmentName ?? DBNull.Value);

                    cmd.Parameters.AddWithValue("@SHADE", (object?)item.Shade ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@P_Remark", (object?)item.Remark ?? DBNull.Value);

                    cmd.Parameters.AddWithValue("@Rate", item.Rate);
                    cmd.Parameters.AddWithValue("@Disc", item.Disc);
                    cmd.Parameters.AddWithValue("@Amount", item.Amount);
                    cmd.Parameters.AddWithValue("@Freight", item.Freight);

                    cmd.Parameters.AddWithValue("@CGPer", item.CGPer);
                    cmd.Parameters.AddWithValue("@SGPer", item.SGPer);
                    cmd.Parameters.AddWithValue("@IGPer", item.IGPer);

                    cmd.Parameters.AddWithValue("@CGAmt", item.CGAmt);
                    cmd.Parameters.AddWithValue("@SGAmt", item.SGAmt);
                    cmd.Parameters.AddWithValue("@IGAmt", item.IGAmt);

                    await cmd.ExecuteNonQueryAsync();
                }

                tx.Commit();
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                tx.Rollback();
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("purchase-orders/get/{userId}/{poNo}")]
public async Task<IActionResult> GetPurchaseOrder(string userId, string poNo)
{
    var decodedPoNo = WebUtility.UrlDecode(poNo);
    var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == userId);
    if (profile == null) return BadRequest("Profile not found");

    using var conn = await _dbService.CreateClientConnectionAsync(profile);
    
    // 1. Fetch Header
    using var cmdHeader = conn.CreateCommand();
    cmdHeader.CommandText = "SELECT * FROM Pur_Ord_Mst WHERE Po_No = @po_no";
    cmdHeader.Parameters.AddWithValue("@po_no", decodedPoNo);
    
    var header = new Dictionary<string, object>();
    using (var reader = await cmdHeader.ExecuteReaderAsync())
    {
        if (await reader.ReadAsync())
        {
            for (int i = 0; i < reader.FieldCount; i++)
                header[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);
        }
        else
        {
            return NotFound("Purchase Order not found");
        }
    }

    // 2. Fetch Items
    using var cmdItems = conn.CreateCommand();
    cmdItems.CommandText = @"
        SELECT d.*, i.I_NAME1 as ItemName, u.Unit_Name as UOMName 
        FROM Pur_Ordr_Det d
        LEFT JOIN ItemMst i ON i.I_CODE = d.I_Code
        LEFT JOIN UnitMst u ON u.Unit_Code = d.UOM
        WHERE d.po_no = @po_no 
        ORDER BY d.SrNo";
    cmdItems.Parameters.AddWithValue("@po_no", decodedPoNo);

    var items = new List<Dictionary<string, object>>();
    using (var reader = await cmdItems.ExecuteReaderAsync())
    {
        while (await reader.ReadAsync())
        {
            var row = new Dictionary<string, object>();
            for (int i = 0; i < reader.FieldCount; i++)
                row[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);
            items.Add(row);
        }
    }

    return Ok(new { header, items });
}

        [HttpPost("purchase-orders/update/{userId}")]
        public async Task<IActionResult> UpdatePO(
    string userId,
    [FromBody] PurchaseOrderSaveDto dto)
        {
            var profile = await _db.UserProfiles
                .FirstOrDefaultAsync(p => p.AppUserId == userId);

            if (profile == null)
                return BadRequest("Profile not found");

            if (string.IsNullOrWhiteSpace(dto.Header.Purchase_Number))
                return BadRequest("PO Number is required");

            var netAmtRounded = (long)Math.Floor(dto.Header.NetAmount);
            var words = NumberToWordsIndian(netAmtRounded) + " Only";

            var cgPerAvg = dto.Items.Any() ? dto.Items.Average(i => i.CGPer) : 0;
            var cgAmtTotal = dto.Items.Sum(i => i.CGAmt);
            var sgPerAvg = dto.Items.Any() ? dto.Items.Average(i => i.SGPer) : 0;
            var sgAmtTotal = dto.Items.Sum(i => i.SGAmt);
            var igPerAvg = dto.Items.Any() ? dto.Items.Average(i => i.IGPer) : 0;
            var igAmtTotal = dto.Items.Sum(i => i.IGAmt);

            using var conn = await _dbService.CreateClientConnectionAsync(profile);
            using var tx = conn.BeginTransaction();

            try
            {
                // ================= UPDATE HEADER =================
                using (var cmd = conn.CreateCommand())
                {
                    cmd.Transaction = tx;
                    cmd.CommandText = @"
                UPDATE Pur_Ord_Mst
                SET
                    Po_Date      = @Po_Date,
                    Dept_Code    = @Dept_Code,
                    Po_Mode      = @Po_Mode,
                    P_Code       = @P_Code,

                    Tot_Itm      = @Tot_Itm,
                    Tot_Qty      = @Tot_Qty,
                    Tot_Disc     = @Tot_Disc,
                    Tot_Amt      = @Tot_Amt,
                    PF_Chg       = @PF_Chg,
                    NetAmt       = @NetAmt,
                    Words        = @Words,

                    Freight      = @Freight,
                    CGPer        = @CGPer,
                    CGAmt        = @CGAmt,
                    SGPer        = @SGPer,
                    SGAmt        = @SGAmt,
                    IGPer        = @IGPer,
                    IGAmt        = @IGAmt,

                    DTerms       = @DTerms,
                    PTerms       = @PTerms,
                    Disp_Ins     = @Disp_Ins,
                    Sp_Note      = @Sp_Note,
                    Remark       = @Remark,

                    Supp_Ref     = @Supp_Ref,
                    RecDate      = @RecDate,
                    Curr         = @Curr,
                    PO_CrDays    = @PO_CrDays,
                    POM_DELDays  = @POM_DELDays,
                    P_Str_Code   = @P_Str_Code,
                    POM_BrCode   = @POM_BrCode
                WHERE Po_No = @Po_No
            ";

                    cmd.Parameters.AddWithValue("@Po_No", dto.Header.Purchase_Number);
                    cmd.Parameters.AddWithValue("@Po_Date", dto.Header.Purchase_Date);
                    cmd.Parameters.AddWithValue("@Dept_Code", dto.Header.OrderMode);
                    cmd.Parameters.AddWithValue("@Po_Mode", (object?)dto.Header.Mode ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@P_Code", dto.Header.PartyName);

                    cmd.Parameters.AddWithValue("@Tot_Itm", dto.Header.TotalItem);
                    cmd.Parameters.AddWithValue("@Tot_Qty", dto.Header.TotalQty);
                    cmd.Parameters.AddWithValue("@Tot_Disc", dto.Header.TotalDiscount);
                    cmd.Parameters.AddWithValue("@Tot_Amt", dto.Header.GrossAmount);
                    cmd.Parameters.AddWithValue("@PF_Chg", dto.Header.TaxAmount);
                    cmd.Parameters.AddWithValue("@NetAmt", dto.Header.NetAmount);
                    cmd.Parameters.AddWithValue("@Words", words);

                    cmd.Parameters.AddWithValue("@Freight", (object?)dto.Header.Freight ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@CGPer", cgPerAvg);
                    cmd.Parameters.AddWithValue("@CGAmt", cgAmtTotal);
                    cmd.Parameters.AddWithValue("@SGPer", sgPerAvg);
                    cmd.Parameters.AddWithValue("@SGAmt", sgAmtTotal);
                    cmd.Parameters.AddWithValue("@IGPer", igPerAvg);
                    cmd.Parameters.AddWithValue("@IGAmt", igAmtTotal);

                    cmd.Parameters.AddWithValue("@DTerms", (object?)dto.Header.DelTerms ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@PTerms", (object?)dto.Header.PayTerms ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@Disp_Ins", (object?)dto.Header.DispatchIns ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@Sp_Note", (object?)dto.Header.SpNote ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@Remark", (object?)dto.Header.Remarks ?? DBNull.Value);

                    cmd.Parameters.AddWithValue("@Supp_Ref", (object?)dto.Header.Reference ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@RecDate", (object?)dto.Header.RefDate ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@Curr", dto.Header.Currency);
                    cmd.Parameters.AddWithValue("@PO_CrDays", (object?)dto.Header.CrDays ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@POM_DELDays", (object?)dto.Header.DelDays ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@P_Str_Code", dto.Header.StoreName);
                    cmd.Parameters.AddWithValue("@POM_BrCode", (object?)dto.Header.AgentName ?? DBNull.Value);

                    await cmd.ExecuteNonQueryAsync();
                }

                // ================= DELETE OLD ITEMS =================
                using (var delCmd = conn.CreateCommand())
                {
                    delCmd.Transaction = tx;
                    delCmd.CommandText =
                        "DELETE FROM Pur_Ordr_Det WHERE po_no = @po_no";

                    delCmd.Parameters.AddWithValue(
                        "@po_no", dto.Header.Purchase_Number);

                    await delCmd.ExecuteNonQueryAsync();
                }

                // ================= REINSERT ITEMS =================
                foreach (var item in dto.Items)
                {
                    using var cmd = conn.CreateCommand();
                    cmd.Transaction = tx;

                    cmd.CommandText = @"
                INSERT INTO Pur_Ordr_Det
                (
                    po_no, SrNo,
                    I_Code, Ind_Code, UOM,
                    Qty,
                    Kh_Code, DEP_CODE,
                    SHADE, P_Remark,
                    Rate, Disc, Amount, Freight,
                    CGPer, SGPer, IGPer,
                    CGAmt, SGAmt, IGAmt
                )
                VALUES
                (
                    @po_no, @SrNo,
                    @I_Code, @Ind_Code, @UOM,
                    @Qty,
                    @Kh_Code, @DEP_CODE,
                    @SHADE, @P_Remark,
                    @Rate, @Disc, @Amount, @Freight,
                    @CGPer, @SGPer, @IGPer,
                    @CGAmt, @SGAmt, @IGAmt
                )
            ";

                    cmd.Parameters.AddWithValue("@po_no", dto.Header.Purchase_Number);
                    cmd.Parameters.AddWithValue("@SrNo", item.SrNo);
                    cmd.Parameters.AddWithValue("@I_Code", item.ItemCode);
                    cmd.Parameters.AddWithValue("@Ind_Code", (object?)item.IndCode ?? "None");
                    cmd.Parameters.AddWithValue("@UOM", item.UQC);
                    cmd.Parameters.AddWithValue("@Qty", item.GRNQty);
                    cmd.Parameters.AddWithValue("@Kh_Code", (object?)item.CostCenterName ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@DEP_CODE", (object?)item.DepartmentName ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@SHADE", (object?)item.Shade ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@P_Remark", (object?)item.Remark ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@Rate", item.Rate);
                    cmd.Parameters.AddWithValue("@Disc", item.Disc);
                    cmd.Parameters.AddWithValue("@Amount", item.Amount);
                    cmd.Parameters.AddWithValue("@Freight", item.Freight);
                    cmd.Parameters.AddWithValue("@CGPer", item.CGPer);
                    cmd.Parameters.AddWithValue("@SGPer", item.SGPer);
                    cmd.Parameters.AddWithValue("@IGPer", item.IGPer);
                    cmd.Parameters.AddWithValue("@CGAmt", item.CGAmt);
                    cmd.Parameters.AddWithValue("@SGAmt", item.SGAmt);
                    cmd.Parameters.AddWithValue("@IGAmt", item.IGAmt);

                    await cmd.ExecuteNonQueryAsync();
                }

                tx.Commit();
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                tx.Rollback();
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("purchase-orders/delete/{userId}/{poNo}")]
        public async Task<IActionResult> DeletePO(string userId, string poNo)
        {
            var decodedPoNo = WebUtility.UrlDecode(poNo);
            var profile = await _db.UserProfiles
                .FirstOrDefaultAsync(p => p.AppUserId == userId);

            if (profile == null)
                return BadRequest("Profile not found");

            using var conn = await _dbService.CreateClientConnectionAsync(profile);
            using var tx = conn.BeginTransaction();

            try
            {
                // 1️⃣ Delete Items
                using (var cmd = conn.CreateCommand())
                {
                    cmd.Transaction = tx;
                    cmd.CommandText =
                        "DELETE FROM Pur_Ordr_Det WHERE po_no = @po_no";

                    cmd.Parameters.AddWithValue("@po_no", decodedPoNo);
                    await cmd.ExecuteNonQueryAsync();
                }

                // 2️⃣ Delete Header
                using (var cmd = conn.CreateCommand())
                {
                    cmd.Transaction = tx;
                    cmd.CommandText =
                        "DELETE FROM Pur_Ord_Mst WHERE Po_No = @Po_No";

                    cmd.Parameters.AddWithValue("@Po_No", decodedPoNo);
                    var rows = await cmd.ExecuteNonQueryAsync();

                    if (rows == 0)
                    {
                        tx.Rollback();
                        return NotFound("PO not found");
                    }
                }

                tx.Commit();
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                tx.Rollback();
                return BadRequest(ex.Message);
            }
        }

        // [HttpPost("item/save/{userId}")]
        // public async Task<IActionResult> SaveItem(string userId, [FromBody] PurchaseOrderSaveDto dto)
        // {
        //     var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == userId);
        //     if (profile == null) return BadRequest("Profile not found");

        //     using var conn = await _dbService.CreateClientConnectionAsync(profile);
        //     using var cmd = conn.CreateCommand();

        //     cmd.CommandText = @"
        //         INSERT INTO WIPMST
        //         (
        //             WIP_CODE,
        //             WIP_NAME,
        //             WIP_MODE
        //         )
        //         VALUES
        //         (
        //             @WIP_CODE,
        //             @WIP_NAME,
        //             @WIP_MODE
        //         )";

        //     cmd.Parameters.AddWithValue("@WIP_CODE", dto.MainCode);
        //     cmd.Parameters.AddWithValue("@WIP_Name", dto.MainName);
        //     cmd.Parameters.AddWithValue("@WIP_MODE", (object?)dto.Mode ?? DBNull.Value);

        //     try
        //     {
        //         await cmd.ExecuteNonQueryAsync();
        //         return Ok(new { success = true });
        //     }
        //     catch (Exception ex)
        //     {
        //         return BadRequest(ex.Message);
        //     }
        // }

        // [HttpPost("item/update/{userId}")]
        // public async Task<IActionResult> UpdateItem( string userId, [FromBody] ItemSaveDto dto)
        // {
        //     var profile = await _db.UserProfiles
        //         .FirstOrDefaultAsync(p => p.AppUserId == userId);

        //     if (profile == null)
        //         return BadRequest("Profile not found");

        //     try
        //     {
        //         using var conn = await _dbService.CreateClientConnectionAsync(profile);
        //         using var cmd = conn.CreateCommand();

        //         cmd.CommandText = @"
        //             UPDATE WIPMST
        //             SET
        //                 WIP_NAME = @WIP_NAME,
        //                 WIP_MODE  = @WIP_MODE
        //             WHERE WIP_CODE = @WIP_CODE
        //         ";

        //         cmd.Parameters.AddWithValue("@WIP_CODE", dto.MainCode);
        //         cmd.Parameters.AddWithValue("@WIP_Name", dto.MainName);
        //         cmd.Parameters.AddWithValue("@WIP_MODE", (object?)dto.Mode ?? DBNull.Value);

        //         var rowsAffected = await cmd.ExecuteNonQueryAsync();

        //         if (rowsAffected == 0)
        //             return NotFound("No record found with the provided Code.");

        //         return Ok(new { success = true });
        //     }
        //     catch (Exception ex)
        //     {
        //         // This returns the specific SQL error (e.g., "String or binary data would be truncated")
        //         return BadRequest(ex.Message);
        //     }
        // }

        // [HttpDelete("item/delete/{userId}/{code}")]
        // public async Task<IActionResult> DeleteItem(string userId, string code)
        // {
        //     var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == userId);
        //     if (profile == null) return BadRequest("Profile not found");

        //     try
        //     {
        //         using var conn = await _dbService.CreateClientConnectionAsync(profile);
        //         using var cmd = conn.CreateCommand();
        //         cmd.CommandText = "DELETE FROM WIPMST WHERE WIP_CODE = @WIP_CODE";
        //         cmd.Parameters.AddWithValue("@WIP_CODE", code);

        //         var rows = await cmd.ExecuteNonQueryAsync();
        //         if (rows == 0) return NotFound("Record not found in database.");
        //         return Ok(new { success = true });
        //     }
        //     catch (Exception ex)
        //     {
        //         return BadRequest($"Database Error: {ex.Message}");
        //     }
        // }

    }
}
