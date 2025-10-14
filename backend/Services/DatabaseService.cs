using System.Data;
using System.Data.SqlClient;
using System.Threading.Tasks;
using minutechart.Models;

namespace minutechart.Services
{
    public class DatabaseService
    {
        public bool TestConnection(string server, string database, string username, string password, out string errorMessage)
        {
            errorMessage = string.Empty;
            try
            {
                var connectionString = BuildConnectionString(server, database, username, password);
                using (var connection = new SqlConnection(connectionString))
                {
                    connection.Open();
                }
                return true;
            }
            catch (Exception ex)
            {
                errorMessage = ex.Message + (ex.InnerException != null ? " - Inner: " + ex.InnerException.Message : "");
                // Enhanced logging for better debugging
                Console.WriteLine($"Connection Error: {ex.Message}");  // Use a proper logger in production
                return false;
            }
        }

        public string BuildConnectionString(string server, string database, string username, string password)
        {
            return $"Server={server};Database={database};User Id={username};Password={password};Encrypt=True;TrustServerCertificate=True;";
        }

        // ✅ This is what you were missing
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
