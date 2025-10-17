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

        // Retry connection with fallback encrypt options
        public bool TestConnection(string server, string database, string username, string password, out string errorMessage)
        {
            errorMessage = string.Empty;

            // Try both Encrypt=True and Encrypt=False with TrustServerCertificate=True
            var connectionStringsToTry = new[] {
                BuildConnectionString(server, database, username, password, true),
                BuildConnectionString(server, database, username, password, false),
            };

            foreach (var connStr in connectionStringsToTry)
            {
                try
                {
                    _logger.LogInformation($"Attempting SQL connection with connection string: {connStr.Replace(password, "****")}");
                    using (var connection = new SqlConnection(connStr))
                    {
                        connection.Open();

                        // Log SQL Server version and encryption status
                        using var cmd = new SqlCommand(@"
                            SELECT @@VERSION as Version,
                                   CASE WHEN ENCRYPT_OPTION = 'TRUE' THEN 'Encrypted' ELSE 'Not Encrypted' END as ConnectionEncryption
                            FROM sys.dm_exec_connections WHERE session_id = @@SPID", connection);
                        using var reader = cmd.ExecuteReader();
                        if (reader.Read())
                        {
                            _logger.LogInformation("SQL Server Version: {0}", reader["Version"]?.ToString());
                            _logger.LogInformation("Connection Encryption: {0}", reader["ConnectionEncryption"]?.ToString());
                        }
                        return true;
                    }
                }
                catch (SqlException ex)
                {
                    _logger.LogWarning($"Connection attempt failed with error: {ex.Message}");
                    errorMessage = ex.Message;
                    // Continue to next attempt
                }
                catch (Exception ex)
                {
                    _logger.LogError($"Unexpected error during connection test: {ex.Message}");
                    errorMessage = ex.Message;
                    // Continue to next attempt
                }
            }

            return false;
        }

        // Build connection string with dynamic Encrypt flag
        public string BuildConnectionString(string server, string database, string username, string password, bool encrypt)
        {
            var connectionString = $"Server={server};Database={database};User Id={username};Password={password};Encrypt={encrypt};TrustServerCertificate=True;Connect Timeout=30;Pooling=False;";
            var safeConnectionString = connectionString.Replace(password, "****");
            _logger.LogInformation("Connection string built: {ConnectionString}", safeConnectionString);
            return connectionString;
        }

        // Create client connection with retry logic
        public async Task<SqlConnection> CreateClientConnectionAsync(string server, string database, string username, string password)
        {
            var connectionStringsToTry = new[] {
                BuildConnectionString(server, database, username, password, true),
                BuildConnectionString(server, database, username, password, false),
            };

            foreach (var connStr in connectionStringsToTry)
            {
                try
                {
                    var connection = new SqlConnection(connStr);
                    await connection.OpenAsync();
                    return connection;
                }
                catch (SqlException ex)
                {
                    _logger.LogWarning($"Async connection attempt failed: {ex.Message}");
                    // try next
                }
                catch (Exception ex)
                {
                    _logger.LogError($"Unexpected exception during async connection: {ex.Message}");
                }
            }

            throw new Exception("Unable to connect to database with both encryption modes.");
        }
    }
}

