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
using System.Globalization;

[Authorize(Roles = "Admin")]
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

    [HttpGet("users/summary")]
    public async Task<IActionResult> GetUserSummary()
    {
        var now = DateTimeHelper.GetIndianTime();

        // Online Users Calculation
        var fiveMinutesAgo = now.AddMinutes(-5);
        var recentlyActiveUserIds = await _db.ActiveSessions
            .Where(s => s.LastActivity >= fiveMinutesAgo)
            .Select(s => s.AppUserId)
            .ToListAsync();

        var nonAdminUsers = _db.Users
            .Where(u => u.EmailConfirmed && u.AdminName == null)
            .ToList();

        var nonAdminUsersOnline = nonAdminUsers
            .Count(u => recentlyActiveUserIds.Contains(u.Id));

        var users = _db.Users
            .Where(u => u.EmailConfirmed && u.AdminName == null)
            .ToList();

        var statusBreakdown = users
            .Where(u => u.EmailConfirmed)
            .GroupBy(u => u.AccountStatus)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToList();

        var trialUsers = users.Count(u =>
            u.TrialEndDate.HasValue &&
            u.TrialEndDate.Value > now &&
            u.SubscriptionStartDate == null &&
            u.SubscriptionEndDate == null);

        var activeSubs = users.Count(u =>
            u.SubscriptionStartDate != null &&
            u.SubscriptionEndDate != null &&
            u.SubscriptionStartDate <= now &&
            u.SubscriptionEndDate >= now);

        var expiredSubs = users.Count(u =>
            u.SubscriptionStartDate != null &&
            u.SubscriptionEndDate != null &&
            u.SubscriptionEndDate < now);

        var noPlan = users.Count(u =>
            u.AdminName == null &&
            u.SubscriptionStartDate == null &&
            u.SubscriptionEndDate == null &&
            (u.TrialEndDate == null || u.TrialEndDate < now));

        return Ok(new
        {
            TotalUsers = users.Count,
            UsersOnline = nonAdminUsersOnline,
            StatusBreakdown = statusBreakdown,
            TrialUsers = trialUsers,
            ActiveSubscriptions = activeSubs,
            ExpiredSubscriptions = expiredSubs,
            NoPlan = noPlan
        });
    }

    [HttpGet("user-breakdown-by-status/{status}")]
    public IActionResult GetUserBreakdownByStatus(string status)
    {
        var today = DateTimeHelper.GetIndianTime();
        var usersByStatus = _db.Users
            .Where(u => u.EmailConfirmed && u.AccountStatus == status)
            .ToList();

        var trialUsers = usersByStatus.Count(u =>
            u.TrialEndDate.HasValue &&
            u.TrialEndDate.Value > today &&
            u.SubscriptionStartDate == null &&
            u.SubscriptionEndDate == null);

        var activeSubscriptions = usersByStatus.Count(u =>
            u.SubscriptionStartDate.HasValue &&
            u.SubscriptionEndDate.HasValue &&
            u.SubscriptionStartDate.Value <= today &&
            u.SubscriptionEndDate.Value >= today);

        var expiredSubscriptions = usersByStatus.Count(u =>
            u.SubscriptionStartDate.HasValue &&
            u.SubscriptionEndDate.HasValue &&
            u.SubscriptionEndDate.Value < today);

        var noPlan = usersByStatus.Count(u =>
            u.AdminName == null &&
            !u.SubscriptionStartDate.HasValue &&
            !u.SubscriptionEndDate.HasValue &&
            (!u.TrialEndDate.HasValue || u.TrialEndDate.Value < today));

        var result = new
        {
            Status = status,
            TrialUsers = trialUsers,
            ActiveSubscriptions = activeSubscriptions,
            ExpiredSubscriptions = expiredSubscriptions,
            NoPlan = noPlan
        };

        return Ok(result);
    }

    [HttpGet("subscriptions/summary")]
    public IActionResult GetSubscriptionSummary()
    {
        var now = DateTimeHelper.GetIndianTime();

        var paidOrderIds = _db.RazorpayOrders
            .Where(o => o.Status.ToLower() == "paid")
            .Select(o => o.OrderId)
            .ToList();

        var invoices = _db.Invoices
        .Include(i => i.Plan)
            .Join(_db.RazorpayOrders.Where(o => o.Status.ToLower() == "paid"),
            i => i.RazorpayOrderId,
            o => o.OrderId,
            (i, o) => i)
            .ToList();

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

        var active = invoices.Count(i =>
            i.PlanStartDate.HasValue && i.PlanEndDate.HasValue &&
            i.PlanStartDate.Value < now && i.PlanEndDate.Value > now);

        var expired = invoices.Count(i =>
            i.PlanStartDate.HasValue && i.PlanEndDate.HasValue &&
            i.PlanStartDate.Value < now && i.PlanEndDate.Value < now);

        var future = invoices.Count(i =>
            i.PlanStartDate.HasValue && i.PlanEndDate.HasValue &&
            i.PlanStartDate.Value > now && i.PlanEndDate.Value > now);

        var result = new
        {
            TotalSubscriptions = paidOrderIds.Count,
            SubscriptionGroups = subscriptionGroups,
            ActiveSubscriptions = active,
            ExpiredSubscriptions = expired,
            FutureSubscriptions = future
        };

        return Ok(result);
    }

    [HttpGet("revenue/summary")]
    public IActionResult GetRevenueSummary()
    {
        var now = DateTimeHelper.GetIndianTime();

        var invoices = _db.Invoices
       .Include(i => i.Plan)
       .Where(i => i.Status.ToLower() == "paid")
       .ToList();

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

    [HttpGet("queries/summary")]
    public IActionResult GetQuerySummary()
    {
        var now = DateTimeHelper.GetIndianTime();

        var allQueries = _db.UserQueries
            .Include(q => q.AppUser) // include user for company name
            .ToList();

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


    [HttpGet("users/top-revenue")]
    public IActionResult GetTopRevenueUsers()
    {
        var topUsers = _db.Invoices
            .Include(i => i.AppUser) // include user for company name
            .Include(i => i.Plan)
            .Where(i => i.Status.ToLower() == "paid")
            .GroupBy(i => new { i.AppUserId, i.AppUser.CompanyName })
            .Select(g => new
            {
                CompanyName = g.Key.CompanyName,
                TotalRevenue = g.Sum(i => i.Amount),
                Plans = g.Select(i => i.Plan.Name).Distinct().ToList()
            })
            .OrderByDescending(g => g.TotalRevenue)
            .Take(10)
            .ToList();

        return Ok(topUsers);
    }

    [HttpGet("complaints/summary")]
    public IActionResult GetComplaintSummary()
    {
        var total = _db.Complaints.Count();
        var open = _db.Complaints.Count(c => c.Status == "Open");
        var inProgress = _db.Complaints.Count(c => c.Status == "In Progress");
        var resolved = _db.Complaints.Count(c => c.Status == "Resolved");
        var closed = _db.Complaints.Count(c => c.Status == "Closed");

        var categoryBreakdown = _db.Complaints
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