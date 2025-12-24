using System.Data;
using Microsoft.Data.SqlClient;
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
                errorMessage = ex.Message;
                return false;
            }
        }

        public string BuildConnectionString(string server, string database, string username, string password)
        {
            return $"Server={server};Database={database};User Id={username};Password={password};Encrypt=False;TrustServerCertificate=True;Column Encryption Setting=Disabled;Persist Security Info=False;MultipleActiveResultSets=True";
        }

        public async Task<SqlConnection> CreateClientConnectionAsync(UserProfile profile)
        {
            var decryptedPassword = EncryptionHelper.Decrypt(profile.DbPassword);

            var connectionString = BuildConnectionString(
                profile.ServerName,
                profile.DatabaseName,
                profile.DbUsername,
                decryptedPassword
            );

            var connection = new SqlConnection(connectionString);
            await connection.OpenAsync();
            return connection;
        }
    }
}
