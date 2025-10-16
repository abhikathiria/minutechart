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
        public Task<ClientDbContext?> CreateAsync(UserProfile profile)
        {
            if (profile == null ||
                string.IsNullOrWhiteSpace(profile.ServerName) ||
                string.IsNullOrWhiteSpace(profile.DatabaseName) ||
                string.IsNullOrWhiteSpace(profile.DbUsername) ||
                string.IsNullOrWhiteSpace(profile.DbPassword))
            {
                return Task.FromResult<ClientDbContext?>(null);
            }

            // Use SqlConnectionStringBuilder
            var builder = new SqlConnectionStringBuilder
            {
                DataSource = profile.ServerName,
                InitialCatalog = profile.DatabaseName,
                UserID = profile.DbUsername,
                Password = profile.DbPassword,
                TrustServerCertificate = true,
                MultipleActiveResultSets = true,
                ConnectTimeout = 30,
                Pooling = false
            };

            // Manually append Encrypt=Optional
            var connectionString = builder.ConnectionString + ";Encrypt=Optional";

            var optionsBuilder = new DbContextOptionsBuilder<ClientDbContext>();
            optionsBuilder.UseSqlServer(connectionString);

            var context = new ClientDbContext(optionsBuilder.Options);
            return Task.FromResult<ClientDbContext?>(context);
            
        }
    }
}