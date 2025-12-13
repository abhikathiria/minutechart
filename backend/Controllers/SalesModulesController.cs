using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using minutechart.Data;
using minutechart.Helpers;
using minutechart.Models;
using minutechart.Services;
using Microsoft.AspNetCore.Authorization;
using minutechart.DTOs;
using System;
using System.Linq;
using System.Text.Json;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace minutechart.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SalesModulesController : ControllerBase
    {
        private readonly MinutechartDbContext _db;
        private readonly DatabaseService _dbService;
        private readonly UserManager<AppUser> _userManager;
        private readonly ActivityLogger _activityLogger;

        // Fixed list of component ids (same as frontend)
        private static readonly List<string> SALES_COMPONENT_IDS = new()
        {
            "sa_kpi_clients","sa_kpi_agents","sa_kpi_invoices","sa_kpi_sales","sa_kpi_qty","sa_kpi_rate",
            "sa_filter_client","sa_filter_consignee","sa_filter_agent","sa_filter_product",
            "sa_pie_branch","sa_pie_costcenter","sa_pie_channel","sa_map_sales","sa_line_sales_qty",
            "sa_table_book","sa_table_category","sa_table_product","sa_table_client","sa_table_delivery","sa_table_agent"
        };

        public SalesModulesController(MinutechartDbContext db, UserManager<AppUser> userManager, DatabaseService dbService, ActivityLogger activityLogger)
        {
            _db = db;
            _dbService = dbService;
            _userManager = userManager;
            _activityLogger = activityLogger;
        }

        // GET list for admin UI
        [HttpGet("list/{userId}")]
        public async Task<IActionResult> List(string userId)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return NotFound(new { message = "User not found" });

            var rows = await _db.SalesModules
                .Where(x => x.AppUserId == userId && !x.HideQuery) // return visible by default for non-admins?
                .ToListAsync();

            // Build response merging fixed component list
            var dict = new Dictionary<string, object>();
            foreach (var comp in SALES_COMPONENT_IDS)
            {
                var r = rows.FirstOrDefault(x => x.ComponentId == comp);
                if (r != null)
                {
                    dict[comp] = new
                    {
                        id = r.Id,
                        componentId = r.ComponentId,
                        moduleTitle = r.ModuleTitle,
                        sqlQuery = r.SqlQuery,
                        lastUpdated = r.LastUpdated,
                        createdAt = r.CreatedAt,
                        hideQuery = r.HideQuery
                    };
                }
                else
                {
                    dict[comp] = null;
                }
            }

            await _activityLogger.LogAsync("viewed sales modules list for", "User", user.UserName ?? user.Email);
            return Ok(dict);
        }

        // POST save/update
        public class SaveRequest
        {
            public string ComponentId { get; set; }
            public string? ModuleTitle { get; set; }
            public string SqlQuery { get; set; }
        }

        [HttpPost("save/{userId}")]
        public async Task<IActionResult> Save(string userId, [FromBody] SaveRequest req)
        {
            if (req == null || string.IsNullOrEmpty(req.ComponentId) || !SALES_COMPONENT_IDS.Contains(req.ComponentId))
                return BadRequest(new { success = false, message = "Invalid ComponentId" });

            var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == userId);
            if (profile == null) return BadRequest(new { success = false, message = "User profile not found" });

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            var targetUser = user?.UserName ?? user?.Email ?? userId;

            // Validate SQL by testing execution (safe test)
            // inside Save(...) just before executing test query
            try
            {
                using var conn = await _dbService.CreateClientConnectionAsync(profile);
                using var cmd = conn.CreateCommand();
                var sql = SQLShortNameHelper.InjectShortName(req.SqlQuery, profile.ShortName);
                cmd.CommandText = sql;

                // Add test parameters if the query references them (prevents validation errors)
                var addParam = new Action<string, object>((name, val) =>
                {
                    var p = cmd.CreateParameter();
                    p.ParameterName = name;
                    p.Value = val ?? (object)DBNull.Value;
                    cmd.Parameters.Add(p);
                });

                // Add safe defaults (dates and nulls)
                addParam("@startDate", DateTime.Now.AddYears(-1));
                addParam("@endDate", DateTime.Now);
                addParam("@clientId", DBNull.Value);
                addParam("@agentId", DBNull.Value);
                addParam("@productId", DBNull.Value);
                addParam("@consigneeId", DBNull.Value);

                var reader = await cmd.ExecuteReaderAsync();
                await reader.CloseAsync();
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"SQL validation failed: {ex.Message}" });
            }


            var existing = await _db.SalesModules
                .FirstOrDefaultAsync(x => x.AppUserId == userId && x.ComponentId == req.ComponentId);

            if (existing != null)
            {
                existing.ModuleTitle = req.ModuleTitle;
                existing.SqlQuery = req.SqlQuery;
                existing.LastUpdated = DateTimeHelper.GetIndianTime();
                existing.UserIpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? existing.UserIpAddress;

                _db.SalesModules.Update(existing);
                await _db.SaveChangesAsync();

                await _activityLogger.LogAsync("updated sales module", "SalesModule", req.ComponentId, targetUser);
                return Ok(new { success = true, message = "Updated", id = existing.Id });
            }

            var newRow = new SalesModule
            {
                AppUserId = userId,
                ComponentId = req.ComponentId,
                ModuleTitle = req.ModuleTitle,
                SqlQuery = req.SqlQuery,
                CreatedAt = DateTimeHelper.GetIndianTime(),
                LastUpdated = DateTimeHelper.GetIndianTime(),
                UserIpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
            };

            _db.SalesModules.Add(newRow);
            await _db.SaveChangesAsync();

            await _activityLogger.LogAsync("created sales module", "SalesModule", req.ComponentId, targetUser);
            return Ok(new { success = true, message = "Created", id = newRow.Id });
        }

        // POST execute (test run) - this runs admin SQL for the configured component
        public class ExecuteRequest
        {
            public string ComponentId { get; set; }
            public DateTime? StartDate { get; set; }
            public DateTime? EndDate { get; set; }
            public string? ClientId { get; set; }
            public string? AgentId { get; set; }
            public string? ProductId { get; set; }
            public string? ConsigneeId { get; set; }
        }

        [HttpPost("test-raw/{userId}")]
        public async Task<IActionResult> TestRaw(string userId, [FromBody] SaveRequest req)
        {
            var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == userId);
            if (profile == null)
                return BadRequest(new { success = false, message = "User profile not found" });

            try
            {
                using var conn = await _dbService.CreateClientConnectionAsync(profile);
                using var cmd = conn.CreateCommand();
                var sql = SQLShortNameHelper.InjectShortName(req.SqlQuery, profile.ShortName);
                cmd.CommandText = sql;


                // same test params
                var addParam = new Action<string, object>((name, val) =>
                {
                    var p = cmd.CreateParameter();
                    p.ParameterName = name;
                    p.Value = val ?? DBNull.Value;
                    cmd.Parameters.Add(p);
                });

                addParam("@startDate", DateTime.Now.AddYears(-1));
                addParam("@endDate", DateTime.Now);
                addParam("@clientId", DBNull.Value);
                addParam("@agentId", DBNull.Value);
                addParam("@productId", DBNull.Value);
                addParam("@consigneeId", DBNull.Value);

                var reader = await cmd.ExecuteReaderAsync();
                var table = new List<Dictionary<string, object>>();

                while (await reader.ReadAsync())
                {
                    var row = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++)
                        row[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);
                    table.Add(row);
                }

                await reader.CloseAsync();
                // return Ok(new { success = true, data = table });
                return Ok(new
                {
                    success = true,
                    shortName = profile.ShortName,
                    resolvedSql = sql,
                    data = table
                });

            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("execute/{userId}")]
        public async Task<IActionResult> Execute(string userId, [FromBody] ExecuteRequest req)
        {
            var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == userId);
            if (profile == null) return BadRequest(new { success = false, message = "User profile not found" });

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            var targetUser = user?.UserName ?? user?.Email ?? userId;

            var module = await _db.SalesModules.FirstOrDefaultAsync(x => x.AppUserId == userId && x.ComponentId == req.ComponentId && !x.HideQuery);

            // If not configured -> let frontend fallback to dummy
            if (module == null)
            {
                return Ok(new { success = false, dummy = true });
            }

            try
            {
                using var conn = await _dbService.CreateClientConnectionAsync(profile);
                using var cmd = conn.CreateCommand();
                var sql = SQLShortNameHelper.InjectShortName(module.SqlQuery, profile.ShortName);
                cmd.CommandText = sql;

                // add parameters
                var addParam = new Action<string, object>((name, val) =>
                {
                    var p = cmd.CreateParameter();
                    p.ParameterName = name;
                    p.Value = val ?? (object)DBNull.Value;
                    cmd.Parameters.Add(p);
                });

                addParam("@startDate", (object?)req.StartDate ?? DBNull.Value);
                addParam("@endDate", (object?)req.EndDate ?? DBNull.Value);
                addParam("@clientId", (object?)req.ClientId ?? DBNull.Value);
                addParam("@agentId", (object?)req.AgentId ?? DBNull.Value);
                addParam("@productId", (object?)req.ProductId ?? DBNull.Value);
                addParam("@consigneeId", (object?)req.ConsigneeId ?? DBNull.Value);

                var reader = await cmd.ExecuteReaderAsync();
                var table = new List<Dictionary<string, object>>();
                while (await reader.ReadAsync())
                {
                    var row = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++)
                        row[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);
                    table.Add(row);
                }
                await reader.CloseAsync();

                // update last refreshed
                module.LastRefreshedAt = DateTimeHelper.GetIndianTime();
                _db.SalesModules.Update(module);
                await _db.SaveChangesAsync();

                await _activityLogger.LogAsync("executed sales module", "SalesModule", req.ComponentId, targetUser);
                return Ok(new { success = true, title = module.ModuleTitle, data = table });
            }
            catch (Exception ex)
            {
                await _activityLogger.LogAsync("failed execute sales module", "SalesModule", req.ComponentId, targetUser);
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // DELETE
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var row = await _db.SalesModules.FirstOrDefaultAsync(x => x.Id == id);
            if (row == null) return NotFound(new { success = false, message = "Not found" });

            _db.SalesModules.Remove(row);
            await _db.SaveChangesAsync();

            await _activityLogger.LogAsync("deleted sales module", "SalesModule", row.ComponentId, row.AppUserId);
            return Ok(new { success = true, message = "Deleted" });
        }

        // TOGGLE HIDE (no module-limit check — per your request)
        public class ToggleHideRequest { public bool Hide { get; set; } }

        [HttpPost("toggle-hide/{id}")]
        public async Task<IActionResult> ToggleHide(int id, [FromBody] ToggleHideRequest req)
        {
            var row = await _db.SalesModules.FirstOrDefaultAsync(x => x.Id == id);
            if (row == null) return NotFound(new { success = false, message = "Not found" });

            row.HideQuery = req.Hide;
            row.LastUpdated = DateTimeHelper.GetIndianTime();
            _db.SalesModules.Update(row);
            await _db.SaveChangesAsync();

            var action = req.Hide ? "hid sales module" : "made sales module visible";
            await _activityLogger.LogAsync(action, "SalesModule", row.ComponentId, row.AppUserId);

            return Ok(new { success = true, message = req.Hide ? "Hidden" : "Visible" });
        }

        public class TransferModulesRequest
        {
            public string SourceUserId { get; set; }
            public string TargetUserId { get; set; }
            public List<int> ModuleIds { get; set; }
            public string Action { get; set; } = "check"; // check, replace, ignore, cancel
        }

        [HttpPost("transfer-modules")]
        public async Task<IActionResult> TransferSalesModules([FromBody] TransferModulesRequest request)
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
                // Load SALES modules from source user
                var sourceModules = new List<SalesModule>();
                foreach (var id in request.ModuleIds)
                {
                    var module = await _db.SalesModules
                        .FirstOrDefaultAsync(q => q.AppUserId == request.SourceUserId && q.Id == id);
                    if (module != null) sourceModules.Add(module);
                }

                // Load SALES modules from target user
                var targetModules = await _db.SalesModules
                    .Where(q => q.AppUserId == request.TargetUserId)
                    .ToListAsync();

                var duplicates = new List<SalesModule>();
                var copied = new List<SalesModule>();

                foreach (var sm in sourceModules)
                {
                    var existing = targetModules.FirstOrDefault(tm =>
                        tm.ComponentId == sm.ComponentId && tm.SqlQuery == sm.SqlQuery);

                    if (existing != null)
                    {
                        duplicates.Add(existing);

                        // Behaviour: same as UserModules
                        if (request.Action == "replace") continue;
                        if (request.Action == "ignore") continue;
                        if (request.Action == "cancel" || request.Action == "check") continue;
                    }
                }

                // -----------------------------------
                // CHECK MODE
                // -----------------------------------
                if (request.Action == "check")
                {
                    return Ok(new
                    {
                        success = duplicates.Count == 0,
                        duplicates = duplicates.Select(d => new
                        {
                            d.Id,
                            d.ComponentId,
                            d.ModuleTitle
                        })
                    });
                }

                // -----------------------------------
                // CANCEL
                // -----------------------------------
                if (request.Action == "cancel")
                {
                    return Ok(new { success = true, message = "Transfer cancelled." });
                }

                // -----------------------------------
                // REPLACE DUPLICATES
                // -----------------------------------
                if (request.Action == "replace" && duplicates.Any())
                {
                    foreach (var d in duplicates)
                        _db.SalesModules.Remove(d);
                }

                // -----------------------------------
                // COPY MODULES
                // -----------------------------------
                foreach (var sm in sourceModules)
                {
                    var existing = targetModules.FirstOrDefault(tm =>
                        tm.ComponentId == sm.ComponentId && tm.SqlQuery == sm.SqlQuery);

                    if (existing != null)
                    {
                        if (request.Action == "ignore") continue;
                        if (request.Action == "cancel" || request.Action == "check") continue;
                    }

                    var newModule = new SalesModule
                    {
                        AppUserId = request.TargetUserId,
                        ComponentId = sm.ComponentId,
                        ModuleTitle = sm.ModuleTitle,
                        SqlQuery = sm.SqlQuery,
                        HideQuery = false,
                        CreatedAt = DateTimeHelper.GetIndianTime(),
                        LastUpdated = DateTimeHelper.GetIndianTime()
                    };

                    _db.SalesModules.Add(newModule);
                    copied.Add(newModule);
                }

                await _db.SaveChangesAsync();

                await _activityLogger.LogAsync(
                    $"Transferred {copied.Count} sales modules",
                    "SalesModule",
                    sourceName,
                    targetName
                );

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
                return StatusCode(500, new { success = false, message = "An error occurred while transferring sales modules." });
            }
        }

    }
}
