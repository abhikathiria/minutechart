using Microsoft.AspNetCore.SignalR;

namespace minutechart.Hubs
{
    public class DashboardHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            var tenantId = Context.GetHttpContext()?.Request.Query["tenantId"].ToString();
            if (!string.IsNullOrEmpty(tenantId))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, tenantId);
            }
            await base.OnConnectedAsync();
        }
    }
}
