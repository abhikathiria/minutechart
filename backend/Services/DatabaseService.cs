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
                _logger.LogInformation($"Connection string: {connectionString}");

                using (var connection = new SqlConnection(connectionString))
                {
                    connection.Open();
                    _logger.LogInformation("✅ Connection successful!");

                    // Detect SQL Server version and encryption status
                    using (var command = new SqlCommand(@"
                SELECT 
                    @@VERSION as Version,
                    CASE WHEN ENCRYPT_OPTION = 'TRUE' THEN 'Encrypted' ELSE 'Not Encrypted' END as ConnectionEncryption
                FROM sys.dm_exec_connections 
                WHERE session_id = @@SPID", connection))
                    {
                        using (var reader = command.ExecuteReader())
                        {
                            if (reader.Read())
                            {
                                var version = reader["Version"]?.ToString();
                                var encryption = reader["ConnectionEncryption"]?.ToString();
                                _logger.LogInformation($"SQL Server Version: {version}");
                                _logger.LogInformation($"Connection Encryption: {encryption}");
                            }
                        }
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
            // Build base connection string without Encrypt parameter
            var builder = new SqlConnectionStringBuilder
            {
                DataSource = server,
                InitialCatalog = database,
                UserID = username,
                Password = password,
                TrustServerCertificate = true,
                ConnectTimeout = 30,
                Pooling = false,
                MultipleActiveResultSets = false
            };

            // Manually append Encrypt=Optional as it's not properly serialized
            var connectionString = builder.ConnectionString + ";Encrypt=Optional";

            _logger.LogInformation($"Final connection string: {connectionString}");

            return connectionString;
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