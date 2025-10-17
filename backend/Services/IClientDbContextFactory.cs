using Microsoft.EntityFrameworkCore;
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

            var connectionString =
                $"Server={profile.ServerName};Database={profile.DatabaseName};User Id={profile.DbUsername};Password={profile.DbPassword};TrustServerCertificate=True;MultipleActiveResultSets=True;";

            var optionsBuilder = new DbContextOptionsBuilder<ClientDbContext>();
            optionsBuilder.UseSqlServer(connectionString);

            var context = new ClientDbContext(optionsBuilder.Options);
            return Task.FromResult<ClientDbContext?>(context);
        }
    }
}
