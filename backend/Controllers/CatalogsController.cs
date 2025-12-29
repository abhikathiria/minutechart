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
    public class CatalogsController : ControllerBase
    {
        private readonly MinutechartDbContext _db;
        private readonly ILogger<DatabaseService> _logger;
        private readonly UserManager<AppUser> _userManager;
        private readonly IConfiguration _configuration;
        private readonly DatabaseService _dbService;
        private readonly IEmailSender _emailSender;
        private readonly ActivityLogger _activityLogger;

        private readonly string _uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "invoice");

        public CatalogsController(MinutechartDbContext db, UserManager<AppUser> userManager, DatabaseService dbService, IConfiguration configuration, IEmailSender emailSender, ILogger<DatabaseService> logger, ActivityLogger activityLogger)
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

        [HttpGet("user/{id}/queries")]
        public async Task<IActionResult> GetCatalogProducts(string id)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null)
                return NotFound(new { message = "User not found" });

            bool isAnyAdmin = User.IsInRole("Admin") || User.IsInRole("SuperAdmin");

            var queriesQuery = _db.CatalogProducts
                .Where(q => q.AppUserId == user.Id);


            var queries = await queriesQuery
                .OrderByDescending(q => q.QueryLastUpdated)
                .ToListAsync();

            // LOG: Admin viewed user's modules
            await _activityLogger.LogAsync("viewed modules for", "User", user.UserName ?? user.Email);

            return Ok(queries);
        }

        [HttpDelete("delete-query/{id}")]
        public async Task<IActionResult> DeleteUserQuery(int id)
        {
            var query = await _db.CatalogProducts
                .Include(q => q.AppUser) // Include user for logging target name
                .FirstOrDefaultAsync(q => q.Id == id);

            if (query == null) return NotFound();

            var targetUserName = query.AppUser?.UserName ?? query.AppUser?.Email ?? "N/A";
            var queryTitle = query.Title;

            _db.CatalogProducts.Remove(query);
            await _db.SaveChangesAsync();

            // LOG: Admin deleted a module
            await _activityLogger.LogAsync("deleted module", "Module", queryTitle, targetUserName);

            return Ok(new { success = true, message = "Module deleted successfully" });
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
                    var sql = SQLShortNameHelper.InjectShortName(req.QueryText, profile.ShortName);
                    cmd.CommandText = sql;
                    var reader = await cmd.ExecuteReaderAsync();
                    await reader.CloseAsync();
                }

                CatalogProduct userQuery;
                string action;

                if (req.Id != 0) // update existing
                {
                    userQuery = await _db.CatalogProducts.FirstOrDefaultAsync(q => q.Id == req.Id && q.AppUserId == userId);
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

                    _db.CatalogProducts.Update(userQuery);
                    action = "updated module";
                }
                else // create new
                {

                    userQuery = new CatalogProduct
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

                    _db.CatalogProducts.Add(userQuery);
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
        [HttpGet("run-saved-query/{userId}/{queryId}")]
        public async Task<IActionResult> RunSavedQuery(string userId, int queryId)
        {
            var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == userId);
            if (profile == null)
                return BadRequest(new { success = false, message = "User profile not found" });

            var query = await _db.CatalogProducts.FirstOrDefaultAsync(q => q.Id == queryId && q.AppUserId == userId);
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
                var sourceModules = new List<CatalogProduct>();
                foreach (var id in request.ModuleIds)
                {
                    var module = await _db.CatalogProducts.FirstOrDefaultAsync(q => q.AppUserId == request.SourceUserId && q.Id == id);
                    if (module != null) sourceModules.Add(module);
                }

                // Load target modules
                var targetModules = await _db.CatalogProducts
                    .Where(q => q.AppUserId == request.TargetUserId)
                    .ToListAsync();

                var duplicates = new List<CatalogProduct>();
                var copied = new List<CatalogProduct>();

                // Find duplicates + items that will increase usage
                var modulesThatWillIncreaseCount = new List<CatalogProduct>();

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
                        var newQuery = new CatalogProduct
                        {
                            AppUserId = request.TargetUserId,
                            Title = sm.Title,
                            QueryText = sm.QueryText,
                            VisualizationType = sm.VisualizationType,
                            QueryCreatedAtTime = DateTimeHelper.GetIndianTime(),
                            QueryLastUpdated = DateTimeHelper.GetIndianTime(),
                            UserIpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
                        };

                        _db.CatalogProducts.Add(newQuery);
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
                        _db.CatalogProducts.Remove(d);
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

                    var newQuery = new CatalogProduct
                    {
                        AppUserId = request.TargetUserId,
                        Title = sm.Title,
                        QueryText = sm.QueryText,
                        VisualizationType = sm.VisualizationType,
                        QueryCreatedAtTime = DateTimeHelper.GetIndianTime(),
                        QueryLastUpdated = DateTimeHelper.GetIndianTime(),
                        UserIpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
                    };

                    _db.CatalogProducts.Add(newQuery);
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


        [HttpPost("save-row/{userId}/{queryId}")]
        public async Task<IActionResult> SaveRow(
            string userId,
            int queryId,
            [FromBody] Dictionary<string, object> row)
        {
            var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == userId);
            if (profile == null)
                return BadRequest("User profile not found");

            var query = await _db.CatalogProducts
                .FirstOrDefaultAsync(q => q.Id == queryId && q.AppUserId == userId);

            if (query == null)
                return NotFound("Catalog module not found");

            if (string.IsNullOrWhiteSpace(query.InsertQuery) &&
                string.IsNullOrWhiteSpace(query.UpdateQuery))
                return BadRequest("Save is not enabled for this module");

            // ✅ Robust ADD vs EDIT detection
            bool isEdit = false;
            if (!string.IsNullOrWhiteSpace(query.PrimaryKeyColumn) &&
                row.TryGetValue(query.PrimaryKeyColumn, out var pkValue))
            {
                if (pkValue is JsonElement je)
                {
                    isEdit = je.ValueKind != JsonValueKind.Null &&
                             je.ValueKind != JsonValueKind.Undefined &&
                             je.ToString() != "" &&
                             je.ToString() != "0";
                }
                else
                {
                    isEdit = pkValue != null &&
                             pkValue.ToString() != "" &&
                             pkValue.ToString() != "0";
                }
            }

            string sql = isEdit ? query.UpdateQuery : query.InsertQuery;
            if (string.IsNullOrWhiteSpace(sql))
                return BadRequest(isEdit ? "Update not configured" : "Insert not configured");

            using var conn = await _dbService.CreateClientConnectionAsync(profile);
            using var cmd = conn.CreateCommand();
            cmd.CommandText = sql;

            // ✅ Only bind parameters that SQL actually expects
            var expectedParams = ExtractSqlParameters(sql);

            foreach (var kv in row)
            {
                if (!expectedParams.Contains(kv.Key))
                    continue;

                object value = DBNull.Value;

                if (kv.Value is JsonElement je)
                {
                    switch (je.ValueKind)
                    {
                        case JsonValueKind.String:
                            value = je.GetString();
                            break;

                        case JsonValueKind.Number:
                            if (je.TryGetInt32(out var i))
                                value = i;
                            else if (je.TryGetDecimal(out var d))
                                value = d;
                            else
                                value = je.GetDouble();
                            break;

                        case JsonValueKind.True:
                        case JsonValueKind.False:
                            value = je.GetBoolean();
                            break;

                        case JsonValueKind.Null:
                        case JsonValueKind.Undefined:
                            value = DBNull.Value;
                            break;

                        default:
                            value = je.ToString();
                            break;
                    }
                }
                else
                {
                    value = kv.Value ?? DBNull.Value;
                }

                cmd.Parameters.AddWithValue("@" + kv.Key, value);
            }

            await cmd.ExecuteNonQueryAsync();

            await _activityLogger.LogAsync(
                isEdit ? "updated catalog row" : "added catalog row",
                "Catalog",
                query.Title
            );

            return Ok(new { success = true });
        }

        [HttpGet("lookups/categories/{userId}")]
        public async Task<IActionResult> GetCategories(string userId)
        {
            var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == userId);
            if (profile == null) return BadRequest("Profile not found");

            using var conn = await _dbService.CreateClientConnectionAsync(profile);
            using var cmd = conn.CreateCommand();

            cmd.CommandText = "SELECT Cat_Code, Cat_Name FROM CategoryMst ORDER BY Cat_Name";

            var list = new List<object>();
            using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                list.Add(new
                {
                    code = reader["Cat_Code"],
                    name = reader["Cat_Name"]
                });
            }

            return Ok(list);
        }

        [HttpGet("lookups/uoms/{userId}")]
        public async Task<IActionResult> GetUoms(string userId)
        {
            var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == userId);
            if (profile == null) return BadRequest("Profile not found");

            using var conn = await _dbService.CreateClientConnectionAsync(profile);
            using var cmd = conn.CreateCommand();

            cmd.CommandText = "SELECT Unit_Code, Unit_Name FROM UnitMst ORDER BY Unit_Name";

            var list = new List<object>();
            using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                list.Add(new
                {
                    code = reader["Unit_Code"],
                    name = reader["Unit_Name"]
                });
            }

            return Ok(list);
        }

        public class ItemSaveDto
        {
            // public string ProductType { get; set; }   // Cat_Code
            // public string ProductID { get; set; }     // I_CODE
            // public string InternalName { get; set; }  // I_DispNm
            // public string PrimaryUOM { get; set; }    // UnitCode
            // public decimal PerUnitCost { get; set; }  // I_SRate
            // public string ProductName { get; set; }   // I_Name1

            public string MainCode { get; set; }  // WIP_CODE
            public string MainName { get; set; }    // WIP_NAME
            public string? Mode { get; set; }   // WIP_MODE
        }

        [HttpPost("item/save/{userId}")]
        public async Task<IActionResult> SaveItem(
            string userId,
            [FromBody] ItemSaveDto dto)
        {
            var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == userId);
            if (profile == null) return BadRequest("Profile not found");

            using var conn = await _dbService.CreateClientConnectionAsync(profile);
            using var cmd = conn.CreateCommand();

            //     cmd.CommandText = @"
            // INSERT INTO ItemMst
            // (
            //     I_CID,
            //     I_CODE,
            //     I_DispNm,
            //     I_UOM,
            //     I_SRate,
            //     I_Name1
            // )
            // VALUES
            // (
            //     @I_CID,
            //     @I_CODE,
            //     @I_DispNm,
            //     @I_UOM,
            //     @I_SRate,
            //     @I_Name1
            // )";

            //     cmd.Parameters.AddWithValue("@I_CID", dto.ProductType);
            //     cmd.Parameters.AddWithValue("@I_CODE", dto.ProductID);
            //     cmd.Parameters.AddWithValue("@I_DispNm", dto.InternalName);
            //     cmd.Parameters.AddWithValue("@I_UOM", dto.PrimaryUOM);
            //     cmd.Parameters.AddWithValue("@I_SRate", dto.PerUnitCost);
            //     cmd.Parameters.AddWithValue("@I_Name1", dto.ProductName);

            cmd.CommandText = @"
        INSERT INTO WIPMST
        (
            WIP_CODE,
            WIP_NAME,
            WIP_MODE
        )
        VALUES
        (
            @WIP_CODE,
            @WIP_NAME,
            @WIP_MODE
        )";

            cmd.Parameters.AddWithValue("@WIP_CODE", dto.MainCode);
            cmd.Parameters.AddWithValue("@WIP_Name", dto.MainName);
            cmd.Parameters.AddWithValue("@WIP_MODE", (object?)dto.Mode ?? DBNull.Value);

            try
            {
                await cmd.ExecuteNonQueryAsync();
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("item/update/{userId}")]
        public async Task<IActionResult> UpdateItem(
    string userId,
    [FromBody] ItemSaveDto dto)
        {
            var profile = await _db.UserProfiles
                .FirstOrDefaultAsync(p => p.AppUserId == userId);

            if (profile == null)
                return BadRequest("Profile not found");

            try
            {
                using var conn = await _dbService.CreateClientConnectionAsync(profile);
                using var cmd = conn.CreateCommand();

                //         cmd.CommandText = @"
                //     UPDATE ItemMst
                //     SET
                //         I_CID    = @I_CID,
                //         I_DispNm = @I_DispNm,
                //         I_UOM    = @I_UOM,
                //         I_SRate  = @I_SRate,
                //         I_Name1  = @I_Name1
                //     WHERE I_CODE = @I_CODE
                // ";

                //         cmd.Parameters.AddWithValue("@I_CID", dto.ProductType);
                //         cmd.Parameters.AddWithValue("@I_DispNm", dto.InternalName);
                //         cmd.Parameters.AddWithValue("@I_UOM", dto.PrimaryUOM);
                //         cmd.Parameters.AddWithValue("@I_SRate", dto.PerUnitCost);
                //         cmd.Parameters.AddWithValue("@I_Name1", dto.ProductName);
                //         cmd.Parameters.AddWithValue("@I_CODE", dto.ProductID);

                cmd.CommandText = @"
        UPDATE WIPMST
        SET
            WIP_NAME = @WIP_NAME,
            WIP_MODE  = @WIP_MODE
        WHERE WIP_CODE = @WIP_CODE
    ";

                cmd.Parameters.AddWithValue("@WIP_CODE", dto.MainCode);
                cmd.Parameters.AddWithValue("@WIP_Name", dto.MainName);
                cmd.Parameters.AddWithValue("@WIP_MODE", (object?)dto.Mode ?? DBNull.Value);

                var rowsAffected = await cmd.ExecuteNonQueryAsync();

                if (rowsAffected == 0)
                    return NotFound("No record found with the provided Code.");

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                // This returns the specific SQL error (e.g., "String or binary data would be truncated")
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("item/delete/{userId}/{code}")]
        public async Task<IActionResult> DeleteItem(string userId, string code)
        {
            var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == userId);
            if (profile == null) return BadRequest("Profile not found");

            try
            {
                using var conn = await _dbService.CreateClientConnectionAsync(profile);
                using var cmd = conn.CreateCommand();
                cmd.CommandText = "DELETE FROM WIPMST WHERE WIP_CODE = @WIP_CODE";
                cmd.Parameters.AddWithValue("@WIP_CODE", code);

                var rows = await cmd.ExecuteNonQueryAsync();
                if (rows == 0) return NotFound("Record not found in database.");
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return BadRequest($"Database Error: {ex.Message}");
            }
        }

    }
}
