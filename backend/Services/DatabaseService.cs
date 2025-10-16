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
                _logger.LogInformation($"🔍 Starting connection test to {server}:{database}...");

                // Test TCP connectivity
                try
                {
                    var parts = server.Split(',');
                    var host = parts[0];
                    var port = parts.Length > 1 ? int.Parse(parts[1]) : 1433;

                    using (var tcpClient = new System.Net.Sockets.TcpClient())
                    {
                        var connectTask = tcpClient.ConnectAsync(host, port);
                        if (!connectTask.Wait(TimeSpan.FromSeconds(10)))
                        {
                            errorMessage = $"⚠️ TCP connection to {host}:{port} timed out";
                            return false;
                        }
                        _logger.LogInformation($"✅ TCP port {port} reachable");
                    }
                }
                catch (Exception tcpEx)
                {
                    _logger.LogWarning($"⚠️ TCP test failed: {tcpEx.Message}");
                }

                var connectionString = BuildConnectionString(server, database, username, password);
                using (var connection = new SqlConnection(connectionString))
                {
                    connection.Open();
                    _logger.LogInformation("✅ SQL connection successful!");
                }

                return true;
            }
            catch (SqlException sqlEx)
            {
                errorMessage = $"SQL Error {sqlEx.Number}: {sqlEx.Message}";
                _logger.LogError(sqlEx, "SQL Connection Error");
                return false;
            }
            catch (Exception ex)
            {
                errorMessage = $"Error: {ex.Message}";
                _logger.LogError(ex, "General Connection Error");
                return false;
            }
        }

        public string BuildConnectionString(string server, string database, string username, string password)
        {
            // For SQL Server 2012+ compatibility
            return $"Server={server};Database={database};User Id={username};Password={password};Encrypt=False;TrustServerCertificate=True;Connect Timeout=30;MultipleActiveResultSets=True;";
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
