using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using minutechart.Models;
using minutechart.Data;
using minutechart.Helpers;
using minutechart.Services;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

// --- NEW DTO FOR ADMIN BREAKDOWN ---
public class AdminSummaryDto
{
    public string AdminId { get; set; }
    public string AdminName { get; set; }
    public int TotalUsers { get; set; }
    public decimal TotalRevenue { get; set; }
    public int TotalQueries { get; set; }
    public int TotalComplaints { get; set; }
}
// ------------------------------------

[Authorize(Roles = "Admin,SuperAdmin")]
[ApiController]
[Route("api/[controller]")]
public class AdminDashboardController : ControllerBase
{
    private readonly MinutechartDbContext _db;
    private readonly UserManager<AppUser> _userManager;
    private readonly ActivityLogger _activityLogger;

    public AdminDashboardController(MinutechartDbContext db, UserManager<AppUser> userManager, ActivityLogger activityLogger)
    {
        _db = db;
        _activityLogger = activityLogger;
        _userManager = userManager;
    }

    // Helper to get current user and check SuperAdmin
    private async Task<(AppUser currentUser, bool isSuperAdmin)> GetCurrentUserRoleAsync()
    {
        var currentUser = await _userManager.GetUserAsync(User);
        var roles = await _userManager.GetRolesAsync(currentUser);
        bool isSuperAdmin = roles.Contains("SuperAdmin");
        return (currentUser, isSuperAdmin);
    }

    [HttpGet("activitylogs")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> GetActivityLogs([FromQuery] string? targetAdminId, [FromQuery] int take = 10) // <-- ADD PARAMETER & OPTIONAL TAKE
    {
        var (currentUser, isSuperAdmin) = await GetCurrentUserRoleAsync();

        var logsQuery = _db.ActivityLogs
            .OrderByDescending(l => l.Timestamp)
            .Take(take); // Apply take early for efficiency

        var logs = await logsQuery.ToListAsync();

        // SuperAdmin is viewing a specific admin's data
        if (isSuperAdmin && !string.IsNullOrEmpty(targetAdminId))
        {
            var assignedUserIds = await _db.Users
                .Where(u => u.AssignedAdminId == targetAdminId)
                .Select(u => u.Id)
                .ToListAsync();

            // Logs associated with the target admin's actions OR their assigned users' actions
            logs = logs
                .Where(l => l.ActorId == targetAdminId || assignedUserIds.Contains(l.ActorId))
                .ToList();
        }
        // Regular Admin viewing their assigned users or their own actions
        else if (!isSuperAdmin)
        {
            var assignedUserIds = await _db.Users
                .Where(u => u.AssignedAdminId == currentUser.Id)
                .Select(u => u.Id)
                .ToListAsync();

            logs = logs
                .Where(l => l.ActorId == currentUser.Id || assignedUserIds.Contains(l.ActorId))
                .ToList();
        }

        // No explicit filtering is needed if SuperAdmin is viewing the entire dashboard (default case)

        return Ok(logs);
    }

    // ----------------------------------------------------
    // NEW SUPERADMIN ENDPOINT: ADMIN BREAKDOWN
    // ----------------------------------------------------
    [HttpGet("admin/breakdown")]
    [Authorize(Roles = "SuperAdmin")] // Only SuperAdmins can view this aggregated data
    public async Task<IActionResult> GetAdminBreakdown()
    {
        // 1. Get all Admin users to map IDs to Names
        var adminUsers = await _userManager.GetUsersInRoleAsync("Admin");
        var adminIdToNameMap = adminUsers.ToDictionary(a => a.Id, a => a.AdminName ?? a.Email);

        // 2. Fetch all required data points (Users, Invoices, Queries, Complaints)
        var allUsers = await _db.Users.Where(u => u.EmailConfirmed && u.AdminName == null).ToListAsync();
        var allPaidInvoices = await _db.Invoices.Where(i => i.Status.ToLower() == "paid").ToListAsync();
        var allQueries = await _db.UserQueries.ToListAsync();
        var allComplaints = await _db.Complaints.ToListAsync();

        // 3. Group the data by AssignedAdminId (or use an empty string for unassigned)
        var breakdown = adminUsers.Select(admin =>
        {
            var users = allUsers.Where(u => u.AssignedAdminId == admin.Id).ToList();
            var userIds = users.Select(u => u.Id).ToList();

            var revenue = allPaidInvoices.Where(i => userIds.Contains(i.AppUserId)).Sum(i => i.Amount);
            var queries = allQueries.Where(q => userIds.Contains(q.AppUserId)).Count();
            var complaints = allComplaints.Where(c => userIds.Contains(c.AppUserId)).Count();

            return new AdminSummaryDto
            {
                AdminId = admin.Id,
                AdminName = admin.AdminName ?? admin.Email,
                TotalUsers = users.Count,
                TotalRevenue = revenue,
                TotalQueries = queries,
                TotalComplaints = complaints
            };
        }).OrderByDescending(a => a.TotalUsers).ToList();

        // Optional: Include a row for unassigned users
        var unassignedUsers = allUsers.Where(u => u.AssignedAdminId == null).ToList();
        if (unassignedUsers.Any())
        {
            var unassignedUserIds = unassignedUsers.Select(u => u.Id).ToList();
            var unassignedRevenue = allPaidInvoices.Where(i => unassignedUserIds.Contains(i.AppUserId)).Sum(i => i.Amount);
            var unassignedQueries = allQueries.Where(q => unassignedUserIds.Contains(q.AppUserId)).Count();
            var unassignedComplaints = allComplaints.Where(c => unassignedUserIds.Contains(c.AppUserId)).Count();

            breakdown.Add(new AdminSummaryDto
            {
                AdminId = "unassigned",
                AdminName = "Unassigned Users",
                TotalUsers = unassignedUsers.Count,
                TotalRevenue = unassignedRevenue,
                TotalQueries = unassignedQueries,
                TotalComplaints = unassignedComplaints
            });
        }

        return Ok(breakdown);
    }
    // ----------------------------------------------------

    // -------------------------
    // USERS SUMMARY
    // -------------------------
    [HttpGet("users/summary")]
    public async Task<IActionResult> GetUserSummary([FromQuery] string? targetAdminId)
    {
        var now = DateTimeHelper.GetIndianTime();
        var (currentUser, isSuperAdmin) = await GetCurrentUserRoleAsync();

        IQueryable<AppUser> usersQuery = _db.Users.Where(u => u.EmailConfirmed);

        // Get all Admin and SuperAdmin users for role separation later
        var allAdminUsers = await _userManager.GetUsersInRoleAsync("Admin");
        var allSuperAdminUsers = await _userManager.GetUsersInRoleAsync("SuperAdmin");
        var allAdminAndSuperAdminIds = allAdminUsers.Concat(allSuperAdminUsers).Select(u => u.Id).ToHashSet();
        
        // Conditional Filtering for the scope of users being viewed
        if (isSuperAdmin && !string.IsNullOrEmpty(targetAdminId))
        {
            // SuperAdmin viewing a specific admin's assigned users (exclude the admin themselves)
            usersQuery = usersQuery.Where(u => u.AssignedAdminId == targetAdminId && u.AdminName == null);
        }
        else if (!isSuperAdmin)
        {
            // Regular Admin viewing their assigned users (exclude the admin themselves)
            usersQuery = usersQuery.Where(u => u.AssignedAdminId == currentUser.Id && u.AdminName == null);
        }
        else
        {
            // SuperAdmin global view: Include all confirmed users, including Admin/SuperAdmin accounts
            // No additional .Where() needed as the initial query already includes all confirmed users.
        }

        var users = await usersQuery.ToListAsync();

        // ------------------------
        // Role Identification (In-Memory Processing for scoped list)
        // ------------------------
        var totalAdminUsers = users.Count(u => allAdminAndSuperAdminIds.Contains(u.Id));
        var totalRegularUsers = users.Count(u => !allAdminAndSuperAdminIds.Contains(u.Id));

        // ------------------------
        // Online user detection
        // ------------------------
        var fiveMinutesAgo = now.AddMinutes(-5);

        // Materialize session IDs explicitly
        var recentlyActiveUserIds = (await _db.ActiveSessions
            .Where(s => s.LastActivity >= fiveMinutesAgo)
            .Select(s => s.AppUserId)
            .ToListAsync())
            .ToHashSet(); 

        var usersOnline = users.Count(u => recentlyActiveUserIds.Contains(u.Id));
        
        // Count online Admins/Regular users based on the SCOPED list
        var adminsOnline = users.Count(u => 
            recentlyActiveUserIds.Contains(u.Id) && 
            allAdminAndSuperAdminIds.Contains(u.Id)
        );
        var normalUsersOnline = users.Count(u => 
            recentlyActiveUserIds.Contains(u.Id) && 
            !allAdminAndSuperAdminIds.Contains(u.Id)
        );
        
        // ------------------------
        // Status breakdown & Plans (logic is fine, kept for completeness)
        // ------------------------
        var statusBreakdown = users
            .GroupBy(u => u.AccountStatus)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToList();

        var trialUsers = users.Count(u =>
            u.TrialEndDate.HasValue && u.TrialEndDate.Value > now &&
            u.SubscriptionStartDate == null && u.SubscriptionEndDate == null);

        var activeSubs = users.Count(u =>
            u.SubscriptionStartDate <= now && u.SubscriptionEndDate >= now);

        var expiredSubs = users.Count(u =>
            u.SubscriptionStartDate != null && u.SubscriptionEndDate < now);

        var noPlan = users.Count(u =>
            u.SubscriptionStartDate == null && u.SubscriptionEndDate == null &&
            (u.TrialEndDate == null || u.TrialEndDate < now));

        // ------------------------
        // Final Response
        // ------------------------
        return Ok(new
        {
            TotalUsers = users.Count,
            UsersOnline = usersOnline,
            AdminsOnline = adminsOnline, // NEW
            NormalUsersOnline = normalUsersOnline, // NEW
            TotalAdminUsers = totalAdminUsers, // NEW
            TotalRegularUsers = totalRegularUsers, // NEW
            StatusBreakdown = statusBreakdown,
            TrialUsers = trialUsers,
            ActiveSubscriptions = activeSubs,
            ExpiredSubscriptions = expiredSubs,
            NoPlan = noPlan
        });
    }

    // -------------------------
    // USER BREAKDOWN BY STATUS
    // -------------------------
    [HttpGet("user-breakdown-by-status/{status}")]
    public async Task<IActionResult> GetUserBreakdownByStatus(string status, [FromQuery] string? targetAdminId)
    {
        var (currentUser, isSuperAdmin) = await GetCurrentUserRoleAsync();
        var today = DateTimeHelper.GetIndianTime();

        IQueryable<AppUser> query = _db.Users.Where(u => u.EmailConfirmed && u.AccountStatus == status);

        // PRIORITY 1: SuperAdmin is viewing a specific admin's data
        if (isSuperAdmin && !string.IsNullOrEmpty(targetAdminId))
            query = query.Where(u => u.AssignedAdminId == targetAdminId);
        // PRIORITY 2: Regular Admin viewing their assigned users
        else if (!isSuperAdmin)
            query = query.Where(u => u.AssignedAdminId == currentUser.Id);
        // PRIORITY 3: SuperAdmin is viewing the general dashboard (no filter needed)

        var users = await query.ToListAsync();

        var trialUsers = users.Count(u =>
            u.TrialEndDate.HasValue && u.TrialEndDate.Value > today &&
            u.SubscriptionStartDate == null && u.SubscriptionEndDate == null);

        var activeSubscriptions = users.Count(u =>
            u.SubscriptionStartDate <= today && u.SubscriptionEndDate >= today);

        var expiredSubscriptions = users.Count(u =>
            u.SubscriptionEndDate < today && u.SubscriptionStartDate != null);

        var noPlan = users.Count(u =>
            u.SubscriptionStartDate == null && u.SubscriptionEndDate == null &&
            (!u.TrialEndDate.HasValue || u.TrialEndDate.Value < today));

        return Ok(new
        {
            Status = status,
            TrialUsers = trialUsers,
            ActiveSubscriptions = activeSubscriptions,
            ExpiredSubscriptions = expiredSubscriptions,
            NoPlan = noPlan
        });
    }

    // -------------------------
    // SUBSCRIPTIONS SUMMARY
    // -------------------------
    [HttpGet("subscriptions/summary")]
    public async Task<IActionResult> GetSubscriptionSummary([FromQuery] string? targetAdminId) // <-- ADD PARAMETER
    {
        var (currentUser, isSuperAdmin) = await GetCurrentUserRoleAsync();
        var now = DateTimeHelper.GetIndianTime();

        var invoicesQuery = _db.Invoices
            .Include(i => i.Plan)
            .Include(i => i.AppUser)
            .Where(i => i.Status.ToLower() == "paid");

        // PRIORITY 1: SuperAdmin is viewing a specific admin's data
        if (isSuperAdmin && !string.IsNullOrEmpty(targetAdminId))
            invoicesQuery = invoicesQuery.Where(i => i.AppUser.AssignedAdminId == targetAdminId);
        // PRIORITY 2: Regular Admin viewing their assigned users
        else if (!isSuperAdmin)
            invoicesQuery = invoicesQuery.Where(i => i.AppUser.AssignedAdminId == currentUser.Id);
        // PRIORITY 3: SuperAdmin is viewing the general dashboard (no filter needed)

        var invoices = await invoicesQuery.ToListAsync();

        var subscriptionGroups = invoices
            .GroupBy(i => new { i.PlanId, i.Plan.Name })
            .Select(g => new
            {
                name = g.Key.Name,
                value = g.Count(),
                color = g.Key.Name switch
                {
                    "Enterprise" => "#4c51bf",
                    "Pro" => "#6366f1",
                    _ => "#8b5cf6"
                }
            })
            .ToList();

        var active = invoices.Count(i => i.PlanStartDate <= now && i.PlanEndDate >= now);
        var expired = invoices.Count(i => i.PlanEndDate < now);
        var future = invoices.Count(i => i.PlanStartDate > now);

        return Ok(new
        {
            TotalSubscriptions = invoices.Count,
            SubscriptionGroups = subscriptionGroups,
            ActiveSubscriptions = active,
            ExpiredSubscriptions = expired,
            FutureSubscriptions = future
        });
    }

    // -------------------------
    // REVENUE SUMMARY
    // -------------------------
    [HttpGet("revenue/summary")]
    public async Task<IActionResult> GetRevenueSummary([FromQuery] string? targetAdminId) // <-- ADD PARAMETER
    {
        var (currentUser, isSuperAdmin) = await GetCurrentUserRoleAsync();

        var invoicesQuery = _db.Invoices
            .Include(i => i.Plan)
            .Include(i => i.AppUser)
            .Where(i => i.Status.ToLower() == "paid");

        // PRIORITY 1: SuperAdmin is viewing a specific admin's data
        if (isSuperAdmin && !string.IsNullOrEmpty(targetAdminId))
            invoicesQuery = invoicesQuery.Where(i => i.AppUser.AssignedAdminId == targetAdminId);
        // PRIORITY 2: Regular Admin viewing their assigned users
        else if (!isSuperAdmin)
            invoicesQuery = invoicesQuery.Where(i => i.AppUser.AssignedAdminId == currentUser.Id);
        // PRIORITY 3: SuperAdmin is viewing the general dashboard (no filter needed)

        var invoices = await invoicesQuery.ToListAsync();

        var totalRevenue = invoices.Sum(i => i.Amount);

        var monthlyRevenue = invoices
            .GroupBy(i => new { i.PaymentDate.Year, i.PaymentDate.Month })
            .Select(g => new
            {
                Month = $"{g.Key.Month:D2}-{g.Key.Year}",
                Revenue = g.Sum(i => i.Amount)
            })
            .OrderBy(g => g.Month)
            .ToList();

        var planRevenue = invoices
            .GroupBy(i => i.Plan.Name)
            .Select(g => new
            {
                Plan = g.Key,
                Revenue = g.Sum(i => i.Amount)
            })
            .ToList();

        return Ok(new
        {
            TotalRevenue = totalRevenue,
            MonthlyRevenue = monthlyRevenue,
            RevenueByPlan = planRevenue
        });
    }

    // -------------------------
    // QUERY SUMMARY
    // -------------------------
    [HttpGet("queries/summary")]
    public async Task<IActionResult> GetQuerySummary([FromQuery] string? targetAdminId) // <-- ADD PARAMETER
    {
        var (currentUser, isSuperAdmin) = await GetCurrentUserRoleAsync();

        var query = _db.UserQueries.AsQueryable();

        // PRIORITY 1: SuperAdmin is viewing a specific admin's data
        if (isSuperAdmin && !string.IsNullOrEmpty(targetAdminId))
            query = query.Where(q => q.AppUser.AssignedAdminId == targetAdminId);
        // PRIORITY 2: Regular Admin viewing their assigned users
        else if (!isSuperAdmin)
            query = query.Where(q => q.AppUser.AssignedAdminId == currentUser.Id);
        // PRIORITY 3: SuperAdmin is viewing the general dashboard (no filter needed)

        query = query.Include(q => q.AppUser);

        var allQueries = await query.ToListAsync();

        var totalQueries = allQueries.Count;
        var activeUsers = allQueries.Select(q => q.AppUserId).Distinct().Count();

        var topUsers = allQueries
            .GroupBy(q => new { q.AppUserId, q.AppUser.CompanyName })
            .OrderByDescending(g => g.Count())
            .Take(5)
            .Select(g => new
            {
                CompanyName = g.Key.CompanyName,
                QueryCount = g.Count()
            })
            .ToList();

        var approvalModules = allQueries.Count(q => q.IsApprovalModule);

        return Ok(new
        {
            TotalQueries = totalQueries,
            ActiveUsers = activeUsers,
            TopUsers = topUsers,
            ApprovalModules = approvalModules
        });
    }

    // -------------------------
    // TOP REVENUE USERS
    // -------------------------
    [HttpGet("users/top-revenue")]
    public async Task<IActionResult> GetTopRevenueUsers([FromQuery] string? targetAdminId) // <-- ADD PARAMETER
    {
        var (currentUser, isSuperAdmin) = await GetCurrentUserRoleAsync();

        var invoicesQuery = _db.Invoices
            .Include(i => i.AppUser)
            .Include(i => i.Plan)
            .Where(i => i.Status.ToLower() == "paid");

        // PRIORITY 1: SuperAdmin is viewing a specific admin's data
        if (isSuperAdmin && !string.IsNullOrEmpty(targetAdminId))
            invoicesQuery = invoicesQuery.Where(i => i.AppUser.AssignedAdminId == targetAdminId);
        // PRIORITY 2: Regular Admin viewing their assigned users
        else if (!isSuperAdmin)
            invoicesQuery = invoicesQuery.Where(i => i.AppUser.AssignedAdminId == currentUser.Id);
        // PRIORITY 3: SuperAdmin is viewing the general dashboard (no filter needed)

        var topUsers = await invoicesQuery
                .GroupBy(i => new { i.AppUserId, i.AppUser.CompanyName })
                .Select(g => new
                {
                    CompanyName = g.Key.CompanyName,
                    TotalRevenue = g.Sum(i => i.Amount),
                    Plans = g.Select(i => i.Plan.Name).Distinct().ToList()
                })
                .OrderByDescending(g => g.TotalRevenue)
                .Take(10)
                .ToListAsync();

        return Ok(topUsers);
    }

    // -------------------------
    // COMPLAINT SUMMARY
    // -------------------------
    [HttpGet("complaints/summary")]
    public async Task<IActionResult> GetComplaintSummary([FromQuery] string? targetAdminId) // <-- ADD PARAMETER
    {
        var (currentUser, isSuperAdmin) = await GetCurrentUserRoleAsync();

        var complaintsQuery = _db.Complaints.AsQueryable();

        // PRIORITY 1: SuperAdmin is viewing a specific admin's data
        if (isSuperAdmin && !string.IsNullOrEmpty(targetAdminId))
            complaintsQuery = complaintsQuery.Where(c => c.AppUser.AssignedAdminId == targetAdminId);
        // PRIORITY 2: Regular Admin viewing their assigned users
        else if (!isSuperAdmin)
            complaintsQuery = complaintsQuery.Where(c => c.AppUser.AssignedAdminId == currentUser.Id);
        // PRIORITY 3: SuperAdmin is viewing the general dashboard (no filter needed)

        complaintsQuery = complaintsQuery.Include(c => c.AppUser);

        var complaints = await complaintsQuery.ToListAsync();

        var total = complaints.Count;
        var open = complaints.Count(c => c.Status == "Open");
        var inProgress = complaints.Count(c => c.Status == "In Progress");
        var resolved = complaints.Count(c => c.Status == "Resolved");
        var closed = complaints.Count(c => c.Status == "Closed");

        var categoryBreakdown = complaints
            .GroupBy(c => c.Category)
            .Select(g => new { Category = g.Key, Count = g.Count() })
            .ToList();

        return Ok(new
        {
            Total = total,
            Open = open,
            InProgress = inProgress,
            Resolved = resolved,
            Closed = closed,
            CategoryBreakdown = categoryBreakdown
        });
    }
}