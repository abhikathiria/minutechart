namespace minutechart.Models
{
    public class UserQuery
    {
        public int UserQueryId { get; set; }
        public string AppUserId { get; set; }
        public string UserTitle { get; set; }
        public string UserQueryText { get; set; }
        public string VisualizationType { get; set; }
        public DateTime UserQueryCreatedAtTime { get; set; }
        public DateTime UserQueryLastUpdated { get; set; }
        public string UserIpAddress { get; set; }
        public bool HideQuery { get; set; }
    }
}
