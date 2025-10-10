using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using minutechart.Data;
using minutechart.Models;
using minutechart.Services;
using minutechart.DTOs;

namespace minutechart.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly UserManager<AppUser> _userManager;
        private readonly IClientDbContextFactory _factory;
        private readonly MinutechartDbContext _mainDb;
        private readonly AggregateQueryService _queryService;
        private readonly TopTotalPurchasesEntityQueryService _purchasequeryService;


        public DashboardController(
            UserManager<AppUser> userManager,
            IClientDbContextFactory factory,
            MinutechartDbContext mainDb)
        {
            _userManager = userManager;
            _factory = factory;
            _mainDb = mainDb;
            _queryService = new AggregateQueryService();
            _purchasequeryService = new TopTotalPurchasesEntityQueryService();

        }

        [HttpGet("test-connection")]
        public async Task<IActionResult> TestDatabaseConnection()
        {
            var db = await GetClientDbAsync();
            if (db == null)
                return BadRequest(new { message = "Failed to connect to user's database." });

            try
            {
                // Try fetching a single row from Abhi view
                var sample = await db.AnalysisView.FirstOrDefaultAsync();

                if (sample == null)
                    return Ok(new { message = "Connected successfully, but no data found in Analysis View." });

                return Ok(new
                {
                    message = "Connection successful!",
                    sampleRow = sample
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Connection failed during query execution.",
                    error = ex.Message
                });
            }
        }

        private async Task<ClientDbContext?> GetClientDbAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
                return null;

            var profile = await _mainDb.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == user.Id);
            if (profile == null)
                return null;

            // Pass profile directly to factory
            return await _factory.CreateAsync(profile);
        }

        [HttpGet("refresh-time")]
        public async Task<IActionResult> GetRefreshTime()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
                return Unauthorized();

            var profile = await _mainDb.UserProfiles
                .Where(p => p.AppUserId == user.Id)
                .Select(p => new { p.RefreshTime })
                .FirstOrDefaultAsync();

            if (profile == null)
                return NotFound("User profile not found.");

            return Ok(profile.RefreshTime);
        }

        [HttpGet("plan-details")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPlans()
        {
            var plans = await _mainDb.SubscriptionPlans
                .AsNoTracking()
                .OrderBy(p => p.DurationDays) // shortest first
                .ToListAsync();

            return Ok(plans);
        }

        // ✅ Get all queries for the current user
        [HttpGet("queries")]
        public async Task<IActionResult> GetUserQueries()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var queries = await _mainDb.UserQueries
                .Where(q => q.AppUserId == user.Id && !q.HideQuery) // only non-hidden
                .OrderByDescending(q => q.UserQueryLastUpdated)
                .ToListAsync();

            return Ok(queries);
        }


        public class SaveUserQueryRequest
        {
            public int? UserQueryId { get; set; }
            public string UserTitle { get; set; }
            public string UserQueryText { get; set; }
            public string VisualizationType { get; set; }
        }

        [HttpPost("save-query")]
        public async Task<IActionResult> SaveUserQuery([FromBody] SaveUserQueryRequest req)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            // basic validation: not empty + must be SELECT
            if (string.IsNullOrWhiteSpace(req.UserQueryText) ||
                !req.UserQueryText.TrimStart().StartsWith("SELECT", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { success = false, message = "Only SELECT queries are allowed." });
            }

            // validate query by actually executing it
            try
            {
                var clientDb = await GetClientDbAsync();
                if (clientDb == null)
                    return BadRequest(new { success = false, message = "Failed to connect to user's database." });

                var db = clientDb.Database.GetDbConnection();
                await db.OpenAsync();

                var cmd = db.CreateCommand();
                cmd.CommandText = req.UserQueryText;

                // just try reading, no need to capture results for save
                var reader = await cmd.ExecuteReaderAsync();
                await reader.CloseAsync();
                await db.CloseAsync();
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Query validation failed: {ex.Message}" });
            }

            // ---- if validation passed, then continue with save ----
            var ipAddress = HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
            if (string.IsNullOrEmpty(ipAddress))
                ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            if (ipAddress == "::1") ipAddress = "127.0.0.1";

            var istTime = TimeZoneInfo.ConvertTimeBySystemTimeZoneId(DateTime.UtcNow, "India Standard Time");

            if (req.UserQueryId == null || req.UserQueryId == 0)
            {
                // new query
                var newQuery = new UserQuery
                {
                    AppUserId = user.Id,
                    UserTitle = req.UserTitle,
                    UserQueryText = req.UserQueryText,
                    VisualizationType = req.VisualizationType,
                    UserIpAddress = ipAddress ?? "unknown",
                    UserQueryCreatedAtTime = istTime,
                    UserQueryLastUpdated = istTime
                };

                _mainDb.UserQueries.Add(newQuery);
                await _mainDb.SaveChangesAsync();
                return Ok(new { success = true, message = "Module saved successfully", query = newQuery });
            }
            else
            {
                // existing query
                var existing = await _mainDb.UserQueries
                    .FirstOrDefaultAsync(q => q.UserQueryId == req.UserQueryId && q.AppUserId == user.Id);

                if (existing == null) return NotFound();

                existing.UserTitle = req.UserTitle;
                existing.UserQueryText = req.UserQueryText;
                existing.VisualizationType = req.VisualizationType;
                existing.UserQueryLastUpdated = istTime;

                await _mainDb.SaveChangesAsync();
                return Ok(new { success = true, message = "Module updated successfully", query = existing });
            }
        }


        [HttpGet("run-saved/{id}")]
        public async Task<IActionResult> RunSavedQuery(int id)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            // Get the saved query from your main DB
            var query = await _mainDb.UserQueries
                .FirstOrDefaultAsync(q => q.UserQueryId == id && q.AppUserId == user.Id);

            if (query == null) return NotFound();

            // Get the client database
            var clientDb = await GetClientDbAsync();
            if (clientDb == null)
                return BadRequest(new { success = false, message = "Failed to connect to user's database." });

            // Execute the query on the client DB
            try
            {
                var db = clientDb.Database.GetDbConnection();
                await db.OpenAsync();

                var cmd = db.CreateCommand();
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
                await db.CloseAsync();

                return Ok(new { success = true, message = "Query executed successfully", data = table });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        public class ExecuteQueryRequest
        {
            public string Sql { get; set; } = "";
        }

        [HttpPost("execute-query")]
        public async Task<IActionResult> ExecuteQuery([FromBody] ExecuteQueryRequest req)
        {
            var sqlQuery = req.Sql;
            if (string.IsNullOrWhiteSpace(sqlQuery) ||
                !sqlQuery.TrimStart().StartsWith("SELECT", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { success = false, message = "Only SELECT queries are allowed." });
            }

            try
            {
                // Get client-specific DB instead of _mainDb
                var clientDb = await GetClientDbAsync();
                if (clientDb == null)
                    return BadRequest(new { success = false, message = "Failed to connect to user's database." });

                var db = clientDb.Database.GetDbConnection();
                await db.OpenAsync();

                var cmd = db.CreateCommand();
                cmd.CommandText = sqlQuery;

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
                await db.CloseAsync();

                return Ok(new { success = true, message = "Query executed successfully", data = table });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpDelete("delete-query/{id}")]
        public async Task<IActionResult> DeleteUserQuery(int id)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var query = await _mainDb.UserQueries
                .FirstOrDefaultAsync(q => q.UserQueryId == id && q.AppUserId == user.Id);

            if (query == null) return NotFound();

            _mainDb.UserQueries.Remove(query);
            await _mainDb.SaveChangesAsync();

            return Ok(new { success = true, message = "Module deleted successfully" });
        }

    }
}