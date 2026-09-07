using MySql.Data.MySqlClient;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ow.Managers.MySQLManager
{
    static class SqlDatabaseManager
    {
        public static string SERVER = "127.0.0.1";
        public static string UID = Environment.GetEnvironmentVariable("DO_DB_USER") ?? "root";
        public static string PWD = Environment.GetEnvironmentVariable("DO_DB_PASSWORD") ?? "";
        public static string DB = Environment.GetEnvironmentVariable("DO_DB_NAME") ?? "server";
        public static bool Initialized = false;

        public static void Initialize()
        {
            GenerateConnectionString();
            Initialized = true;
            using (var client = GetClient())
            {
                client.ExecuteNonQuery("SELECT 1");
            }
        }

        public static SqlDatabaseClient GetClient()
        {
            var Connection = new MySqlConnection(GenerateConnectionString());
            Connection.Open();
            return new SqlDatabaseClient(Connection);
        }

        public static string GenerateConnectionString()
        {
            if (ConnectionString == "")
            {
                MySqlConnectionStringBuilder ConnectionStringBuilder = new MySqlConnectionStringBuilder();
                ConnectionStringBuilder.Server = SERVER;
                ConnectionStringBuilder.Port = uint.Parse(Environment.GetEnvironmentVariable("DO_DB_PORT") ?? "3306");
                ConnectionStringBuilder.UserID = UID;
                ConnectionStringBuilder.Password = PWD;
                ConnectionStringBuilder.Database = DB;
                ConnectionStringBuilder.CharacterSet = "utf8mb4";
                ConnectionStringBuilder.ConvertZeroDateTime = true;
                ConnectionStringBuilder.Pooling = true;
                ConnectionStringBuilder.MaximumPoolSize = 100;
                ConnectionStringBuilder.SslMode = MySqlSslMode.None;
                ConnectionString = ConnectionStringBuilder.ToString();
            }
            return ConnectionString;
        }

        public static string ConnectionString = "";

    }
}
