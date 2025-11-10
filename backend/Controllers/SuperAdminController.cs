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
    public class SuperAdminController : ControllerBase
    {
        private readonly MinutechartDbContext _db;
        private readonly ILogger<DatabaseService> _logger;
        private readonly UserManager<AppUser> _userManager;
        private readonly IConfiguration _configuration;
        private readonly DatabaseService _dbService;
        private readonly IEmailSender _emailSender;
        private readonly ActivityLogger _activityLogger;


        public SuperAdminController(MinutechartDbContext db, UserManager<AppUser> userManager, DatabaseService dbService, IConfiguration configuration, IEmailSender emailSender, ILogger<DatabaseService> logger, ActivityLogger activityLogger)
        {
            _db = db;
            _userManager = userManager;
            _dbService = dbService;
            _configuration = configuration;
            _emailSender = emailSender;
            _activityLogger = activityLogger;
            _logger = logger;

        }

        [HttpGet("userlist")]
        [Authorize(Roles = "SuperAdmin")] // Only accessible by SuperAdmin
        public async Task<IActionResult> GetSuperAdminUserList()
        {
            // Fetch all users who are NOT SuperAdmin
            var users = await _db.Users
                .Include(u => u.UserProfile)
                .Where(u => u.EmailConfirmed) // Only confirmed users
                .ToListAsync();

            var superAdminList = new List<object>();

            foreach (var user in users)
            {
                var userRoles = await _userManager.GetRolesAsync(user);

                // Exclude SuperAdmins from the list entirely
                if (userRoles.Contains("SuperAdmin"))
                {
                    continue;
                }

                // Determine the highest role for display/action logic
                string userRole = userRoles.Contains("Admin") ? "Admin" : "User";

                // --- Projection Logic (Same as before, plus the Role property) ---
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

                superAdminList.Add(new
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
                    AssignedAdminId = user.AssignedAdminId,
                    UserRole = userRole // 👈 New: Role for differentiation
                });
            }

            await _activityLogger.LogAsync("viewed the full list of", "Admins and Users", "for SuperAdmin management");
            return Ok(superAdminList);
        }

        [HttpPost("promote-to-admin/{userId}")]
        public async Task<IActionResult> PromoteToAdmin(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound();

            await _userManager.RemoveFromRoleAsync(user, "User");
            await _userManager.AddToRoleAsync(user, "Admin");

            return Ok(new { message = $"{user.Email} promoted to Admin." });
        }

        [HttpPost("assign-user/{userId}/to-admin/{adminId}")]
        public async Task<IActionResult> AssignUserToAdmin(string userId, string adminId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            var admin = await _userManager.FindByIdAsync(adminId);

            if (user == null || admin == null)
                return NotFound();

            if (!await _userManager.IsInRoleAsync(admin, "Admin"))
                return BadRequest("Target user is not an Admin.");

            user.AssignedAdminId = admin.Id;
            await _userManager.UpdateAsync(user);

            return Ok(new { message = $"User {user.Email} assigned to Admin {admin.Email}." });
        }



    }
}
