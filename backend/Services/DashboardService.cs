using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using minutechart.Data;
using minutechart.Models;
using minutechart.Helpers;
using minutechart.DTOs;

namespace minutechart.Services
{
    // The DashboardService centralizes logic for fetching module lists and executing client queries.
    public class DashboardService
    {
        private readonly MinutechartDbContext _db;
        private readonly DatabaseService _dbService; // Used for establishing client database connection

        public DashboardService(MinutechartDbContext db, DatabaseService dbService)
        {
            _db = db;
            _dbService = dbService;
        }

        // DTOs required by the ReportController
        public class UserQueryDto
        {
            public int UserQueryId { get; set; }
            public string UserTitle { get; set; }
            public string VisualizationType { get; set; }
            public string UserQueryText { get; set; }
            // Add other necessary properties based on your UserQuery model
            public bool IsApprovalModule { get; set; }
            public string ApprovalIdColumn { get; set; }
        }

        public class QueryExecutionResult
        {
            public bool Success { get; set; }
            public object Data { get; set; } // List<Dictionary<string, object>> for table/chart data
            
            // Assuming these are also needed for the dashboard/refresh rules
            public bool CanRefresh { get; set; } = true; 
            public DateTime? NextAllowedAt { get; set; }
            public bool ExcelAllowed { get; set; } = true; 
        }

        // ----------------------------------------------------
        // 1. GetUserQueries: Fetches the list of active user modules.
        // Logic adapted from AdminController.GetUserQueries
        // ----------------------------------------------------
        public async Task<List<UserQueryDto>> GetUserQueries(string userId)
        {
            // Note: This logic assumes the user is accessing their own dashboard
            // and should only see modules where HideQuery is false.
            
            var queries = await _db.UserQueries
                .Where(q => q.AppUserId == userId && !q.HideQuery)
                .OrderBy(q => q.UserQueryLastUpdated) // Using last updated for ordering, adjust if needed
                .Select(q => new UserQueryDto
                {
                    UserQueryId = q.UserQueryId,
                    UserTitle = q.UserTitle,
                    VisualizationType = q.VisualizationType,
                    UserQueryText = q.UserQueryText,
                    IsApprovalModule = q.IsApprovalModule,
                    ApprovalIdColumn = q.ApprovalIdColumn
                })
                .ToListAsync();

            return queries;
        }

        // ----------------------------------------------------
        // 2. ExecuteQuery: Runs the saved query against the user's database.
        // Logic adapted from AdminController.ExecuteUserQuery (and similar to RunSavedQuery)
        // ----------------------------------------------------
        public async Task<QueryExecutionResult> ExecuteQuery(string queryText, int queryId)
        {
            // Find the UserQuery to get the associated AppUserId
            var userQuery = await _db.UserQueries
                                     .FirstOrDefaultAsync(q => q.UserQueryId == queryId);

            if (userQuery == null)
            {
                return new QueryExecutionResult { Success = false, Data = null };
            }
            
            var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == userQuery.AppUserId);
            if (profile == null)
            {
                return new QueryExecutionResult { Success = false, Data = "User profile not configured." };
            }

            try
            {
                using (var connection = await _dbService.CreateClientConnectionAsync(profile))
                {
                    var cmd = connection.CreateCommand();
                    
                    // Logic from AdminController.ExecuteUserQuery to handle CTEs (WITH clause)
                    string sql = queryText.Trim();
                    if (sql.ToUpper().StartsWith("WITH"))
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

                    // NOTE: You would normally integrate Plan/Subscription logic here 
                    // to set CanRefresh, NextAllowedAt, and ExcelAllowed.
                    // For now, we return the data successfully.

                    return new QueryExecutionResult { 
                        Success = true, 
                        Data = table,
                        CanRefresh = true, // Mocked, replace with actual limit check
                        ExcelAllowed = true // Mocked, replace with actual plan check
                    };
                }
            }
            catch (Exception ex)
            {
                // In a real system, log the full exception
                return new QueryExecutionResult { Success = false, Data = ex.Message };
            }
        }
    }
}