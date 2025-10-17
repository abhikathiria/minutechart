using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using minutechart.Models;
using System.Threading.Tasks;

namespace minutechart.Services
{
    public interface IClientDbContextFactory
    {
        Task<ClientDbContext?> CreateAsync(UserProfile profile);
    }

    public class ClientDbContextFactory : IClientDbContextFactory
    {
        private readonly ILogger<ClientDbContextFactory> _logger;

        public ClientDbContextFactory(ILogger<ClientDbContextFactory> logger)
        {
            _logger = logger;
        }

        public async Task<ClientDbContext?> CreateAsync(UserProfile profile)
        {
            if (profile == null ||
                string.IsNullOrWhiteSpace(profile.ServerName) ||
                string.IsNullOrWhiteSpace(profile.DatabaseName) ||
                string.IsNullOrWhiteSpace(profile.DbUsername) ||
                string.IsNullOrWhiteSpace(profile.DbPassword))
            {
                return null;
            }

            var encryptTrueConn = $"Server={profile.ServerName};Database={profile.DatabaseName};User Id={profile.DbUsername};Password={profile.DbPassword};Encrypt=True;TrustServerCertificate=True;Connect Timeout=30;Pooling=False;MultipleActiveResultSets=True;";
            var encryptFalseConn = $"Server={profile.ServerName};Database={profile.DatabaseName};User Id={profile.DbUsername};Password={profile.DbPassword};Encrypt=False;TrustServerCertificate=True;Connect Timeout=30;Pooling=False;MultipleActiveResultSets=True;";

            var connectionStringsToTry = new[] { encryptTrueConn, encryptFalseConn };

            foreach (var connStr in connectionStringsToTry)
            {
                try
                {
                    var optionsBuilder = new DbContextOptionsBuilder<ClientDbContext>();
                    optionsBuilder.UseSqlServer(connStr);

                    var context = new ClientDbContext(optionsBuilder.Options);
                    await context.Database.OpenConnectionAsync();
                    // optionally test query here to confirm connection
                    return context;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning($"Failed to create ClientDbContext with connection string (hidden password): {connStr.Replace(profile.DbPassword, "****")} Exception: {ex.Message}");
                    // try next connection string
                }
            }

            _logger.LogError("Unable to create ClientDbContext for profile with server {Server} and database {Database}", profile.ServerName, profile.DatabaseName);
            return null;
        }
    }
}
