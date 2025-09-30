namespace minutechart.ViewModels
{
    public class ProfileViewModel
    {
        public string ServerName { get; set; } = null!;
        public string DatabaseName { get; set; } = null!;
        public string DbUsername { get; set; } = null!;
        public string DbPassword { get; set; } = null!;
        public int RefreshTime { get; set; } = 5000;
        public bool HasProfile { get; set; } = false;
    }
}
