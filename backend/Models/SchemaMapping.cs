namespace minutechart.Models
{
    public class SchemaMapping
    {
        public int Id { get; set; }

        // which user this mapping belongs to
        public string AppUserId { get; set; }

        // the "canonical" field name your system expects (like AgentID, CustomerOutstanding, etc.)
        public string CanonicalField { get; set; }

        // the actual table + column from user’s database
        public string UserTable { get; set; }
        public string UserField { get; set; }
    }

}