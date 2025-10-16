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
                _logger.LogInformation($"🔍 Starting connection test to {server}...");

                // Test TCP connectivity first
                try
                {
                    var parts = server.Split(',');
                    var host = parts[0];
                    var port = parts.Length > 1 ? int.Parse(parts[1]) : 1433;

                    using (var tcpClient = new System.Net.Sockets.TcpClient())
                    {
                        _logger.LogInformation($"Testing TCP connection to {host}:{port}...");
                        var connectTask = tcpClient.ConnectAsync(host, port);
                        if (connectTask.Wait(TimeSpan.FromSeconds(10)))
                        {
                            _logger.LogInformation($"✅ TCP port {port} is reachable");
                        }
                        else
                        {
                            _logger.LogWarning($"⚠️ TCP connection timed out after 10 seconds");
                        }
                    }
                }
                catch (Exception tcpEx)
                {
                    _logger.LogWarning($"⚠️ TCP connection test failed: {tcpEx.Message}");
                }

                var connectionString = BuildConnectionString(server, database, username, password);
                _logger.LogInformation($"Attempting SQL connection to Server: {server}, Database: {database}");
                _logger.LogInformation($"Connection string: {connectionString}");

                using (var connection = new SqlConnection(connectionString))
                {
                    _logger.LogInformation("Opening SQL connection...");
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
            // CRITICAL: Encrypt=False with NO TrustServerCertificate
            // This is the ONLY combination that works with SQL Server 2012
            var connectionString =
                $"Server=tcp:{server};Database={database};User Id={username};Password={password};Encrypt=False;TrustServerCertificate=True;Persist Security Info=False;Pooling=False;Connect Timeout=30;MultipleActiveResultSets=True;";

            var safeConnectionString = connectionString.Replace(password, "****");
            _logger.LogInformation("Connection string built: {ConnectionString}", safeConnectionString);

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