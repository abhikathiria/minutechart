using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Identity;
using minutechart.Models;
using minutechart.Data;
using minutechart.Helpers;
using Microsoft.EntityFrameworkCore;

namespace minutechart.Services
{
    public class UserActivityFilter : IAsyncActionFilter
    {
        private readonly MinutechartDbContext _db;

        public UserActivityFilter(MinutechartDbContext db)
        {
            _db = db;
        }

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            // Only proceed if the user is authenticated (Identity framework handles this)
            if (context.HttpContext.User.Identity.IsAuthenticated)
            {
                // Get the user's ID
                var userId = context.HttpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

                if (!string.IsNullOrEmpty(userId))
                {
                    var indianTime = DateTimeHelper.GetIndianTime();
                    
                    // Throttle the database write: only update the timestamp every 15 seconds.
                    var fifteenSecondsAgo = indianTime.AddSeconds(-15);

                    // Try to find the existing session record
                    var session = await _db.ActiveSessions
                        .FirstOrDefaultAsync(s => s.AppUserId == userId);
                    
                    if (session == null)
                    {
                        // Create new session record if none exists
                        session = new ActiveSession 
                        { 
                            AppUserId = userId, 
                            LastActivity = indianTime 
                        };
                        _db.ActiveSessions.Add(session);
                        await _db.SaveChangesAsync(); // Non-critical path, safe to await
                    }
                    else if (session.LastActivity < fifteenSecondsAgo)
                    {
                        // Update only if the last activity was more than 15 seconds ago
                        session.LastActivity = indianTime;
                        await _db.SaveChangesAsync(); // Non-critical path, safe to await
                    }
                }
            }

            // Continue to the controller action
            await next();
        }
    }
}