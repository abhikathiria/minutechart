using System.Data;
using System.Data.SqlClient;
using System.Threading.Tasks;
using minutechart.Models;

namespace minutechart.Services
{
    public class DatabaseService
    {
        private readonly ILogger<DatabaseService> _logger;
    
        public DatabaseService(ILogger<DatabaseService> logger)
        {
            _logger = logger;
        }

        public bool TestConnection(string server, string database, string username, string password, out string errorMessage)
        {
            errorMessage = string.Empty;
            try
            {
                var connectionString = BuildConnectionString(server, database, username, password);
                _logger.LogInformation($"Attempting connection with string: {connectionString}");  // Log the string for debugging
                using (var connection = new SqlConnection(connectionString))
                {
                    connection.Open();
                    _logger.LogInformation("Connection successful!");
                    return true;
                }
            }
            catch (Exception ex)
            {
                errorMessage = $"Error: {ex.Message} - Inner: {ex.InnerException?.Message} - StackTrace: {ex.StackTrace}";
                _logger.LogError(ex, "Connection Error: {ErrorMessage}", errorMessage);  // Detailed logging
                return false;
            }
        }

        public string BuildConnectionString(string server, string database, string username, string password)
        {
            return $"Server={server};Database={database};User Id={username};Password={password};Encrypt=False;TrustServerCertificate=True;";
        }

        public async Task<SqlConnection> CreateClientConnectionAsync(UserProfile profile)
        {
            var connectionString = BuildConnectionString(
                profile.ServerName,
                profile.DatabaseName,
                profile.DbUsername,
                profile.DbPassword
            );

            var connection = new SqlConnection(connectionString);
            await connection.OpenAsync();
            return connection;
        }
    }
}
