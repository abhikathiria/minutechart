using minutechart.Models;
using minutechart.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Linq;

namespace minutechart.Services
{
    public class ActivityLogger
    {
        private readonly MinutechartDbContext _db;
        private readonly IHttpContextAccessor _http;
        private readonly UserManager<AppUser> _userManager;

        public ActivityLogger(MinutechartDbContext db, IHttpContextAccessor http, UserManager<AppUser> userManager)
        {
            _db = db;
            _http = http;
            _userManager = userManager;
        }

        public async Task LogAsync(string action, string targetEntity, string targetName, string targetUserName = null)
        {
            var httpUser = _http.HttpContext?.User;
            var userId = httpUser?.FindFirstValue(ClaimTypes.NameIdentifier);
            var ip = _http.HttpContext?.Connection?.RemoteIpAddress?.ToString();
            var browser = _http.HttpContext?.Request?.Headers["User-Agent"].ToString();

            string actorName = "Unknown";
            string actorRole = "User";

            if (!string.IsNullOrEmpty(userId))
            {
                var appUser = await _userManager.FindByIdAsync(userId);
                if (appUser != null)
                {
                    // Determine actor name and role
                    var roles = await _userManager.GetRolesAsync(appUser);
                    actorRole = roles.FirstOrDefault() ?? "User";

                    actorName = actorRole == "Admin"
                        ? (appUser.AdminName ?? appUser.UserName)
                        : (appUser.CustomerName ?? appUser.UserName);
                }
            }

            string description = targetUserName == null
                ? $"{actorRole} {actorName} {action} {targetEntity} {targetName}"
                : $"{actorRole} {actorName} {action} {targetEntity} {targetName} for {targetUserName}";

            var log = new ActivityLog
            {
                ActorId = userId,
                ActorName = actorName,
                ActorRole = actorRole,
                Action = action,
                TargetEntity = targetEntity,
                TargetName = targetName,
                Description = description,
                IPAddress = ip,
                BrowserInfo = browser
            };

            _db.ActivityLogs.Add(log);
            await _db.SaveChangesAsync();
        }
    }
}
