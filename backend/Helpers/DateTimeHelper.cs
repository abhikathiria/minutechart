namespace minutechart.Helpers
{
    public static class DateTimeHelper
    {
        public static DateTime GetIndianTime()
        {
            TimeZoneInfo istZone;

            try
            {
                istZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time"); // Windows
            }
            catch (TimeZoneNotFoundException)
            {
                istZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata"); // Linux
            }

            return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, istZone);
        }
    }
}
