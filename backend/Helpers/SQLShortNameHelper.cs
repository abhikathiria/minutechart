using System.Text.RegularExpressions;

namespace minutechart.Helpers
{
    public static class SQLShortNameHelper
    {
        public static string InjectShortName(string sql, string? shortName)
        {
            if (string.IsNullOrWhiteSpace(sql) || string.IsNullOrWhiteSpace(shortName))
                return sql;

            return Regex.Replace(
                sql,
                @"\{\{\s*SHORTNAME\s*\}\}",
                shortName.Trim(),
                RegexOptions.IgnoreCase
            );
        }
    }
}
