namespace minutechart.Models
{
    public class ProcurementsRequirement
    {
        public int Id { get; set; }
        public string AppUserId { get; set; }
        public virtual AppUser AppUser { get; set; }
        public string Title { get; set; }
        public string QueryText { get; set; }
        public string? PrimaryKeyColumn { get; set; }
        public string? InsertQuery { get; set; }
        public string? UpdateQuery { get; set; }
        public string VisualizationType { get; set; }
        public DateTime QueryCreatedAtTime { get; set; }
        public DateTime QueryLastUpdated { get; set; }
        public string? UserIpAddress { get; set; }
        public DateTime? LastRefreshedAt { get; set; }
        public string? CachedJsonData { get; set; }
    }
}
