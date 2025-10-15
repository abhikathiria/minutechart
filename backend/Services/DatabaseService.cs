using System.Data;
using Microsoft.Data.SqlClient;
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
                _logger.LogInformation($"Attempting connection to Server: {server}, Database: {database}");

                using (var connection = new SqlConnection(connectionString))
                {
                    connection.Open();
                    _logger.LogInformation("✅ Connection successful!");

                    // Test query execution
                    using (var command = new SqlCommand("SELECT @@VERSION", connection))
                    {
                        var version = command.ExecuteScalar()?.ToString();
                        _logger.LogInformation($"SQL Server Version: {version}");
                    }

                    return true;
                }
            }
            catch (SqlException sqlEx)
            {
                errorMessage = $"SQL Error {sqlEx.Number}: {sqlEx.Message}";
                _logger.LogError(sqlEx, "SQL Connection Error - Number: {ErrorNumber}, Class: {Class}, State: {State}",
                    sqlEx.Number, sqlEx.Class, sqlEx.State);
                return false;
            }
            catch (Exception ex)
            {
                errorMessage = $"Error: {ex.Message}";
                _logger.LogError(ex, "General Connection Error: {ErrorMessage}", ex.Message);
                return false;
            }
        }

        public string BuildConnectionString(string server, string database, string username, string password)
        {
            return $"Server={server};Database={database};User Id={username};Password={password};Encrypt=False;TrustServerCertificate=True;Connect Timeout=30;";
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
