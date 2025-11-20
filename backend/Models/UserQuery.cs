namespace minutechart.Models
{
    public class UserQuery
    {
        public int UserQueryId { get; set; }
        public string AppUserId { get; set; }
        public virtual AppUser AppUser { get; set; }
        public string UserTitle { get; set; }
        public string UserQueryText { get; set; }
        public string VisualizationType { get; set; }
        public DateTime UserQueryCreatedAtTime { get; set; }
        public DateTime UserQueryLastUpdated { get; set; }
        public string UserIpAddress { get; set; }
        public bool HideQuery { get; set; }
        public int Position { get; set; }


        public bool IsApprovalModule { get; set; } = false;  // Flag to indicate if this is an approval module
        public string ApprovalUpdateQuery { get; set; } = "";  // SQL UPDATE query, e.g., "UPDATE transactions SET approved = 1 WHERE id = ?"
        public string ApprovalIdColumn { get; set; } = "";

        public DateTime? LastRefreshedAt { get; set; }
        public string? CachedJsonData { get; set; }   // store JSON string


    }
}
