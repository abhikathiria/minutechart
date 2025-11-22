using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using minutechart.Services;

public class QueuedPlanActivator : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;

    public QueuedPlanActivator(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Run forever until app stops
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var subscriptionService =
                    scope.ServiceProvider.GetRequiredService<SubscriptionServiceV2>();

                int activated = await subscriptionService.ActivateDueQueuedInvoicesAsync();

                if (activated > 0)
                    Console.WriteLine($"[QueuedPlanActivator] Activated {activated} queued plan(s).");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[QueuedPlanActivator] Error: {ex.Message}");
            }

            // Run every 5 minutes (safe interval)
            await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken);
        }
    }
}
