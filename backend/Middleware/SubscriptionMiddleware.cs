using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using minutechart.Models;
using System.Security.Claims;
using System.Threading.Tasks;

public class SubscriptionMiddleware
{
    private readonly RequestDelegate _next;

    public SubscriptionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, UserManager<AppUser> userManager)
    {
        // Skip if not authenticated
        if (!context.User.Identity.IsAuthenticated)
        {
            await _next(context);
            return;
        }

        var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await userManager.FindByIdAsync(userId);

        // Protect only dashboard/service endpoints
        if (context.Request.Path.StartsWithSegments("/dashboard") ||
            context.Request.Path.StartsWithSegments("/analysis"))
        {
            if (user == null || !user.HasActivePlan)
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                await context.Response.WriteAsync("Subscription expired. Please renew.");
                return;
            }
        }

        await _next(context);
    }
}
