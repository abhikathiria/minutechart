namespace minutechart.Models
{
    public class EmployeeData
    {
        public int EmployeeID { get; set; }
        public string EmployeeName { get; set; }
        public string Status { get; set; }
        public string Gender { get; set; }
        public string EmployeeType { get; set; }
        public decimal Salary { get; set; }
        public DateTime DateOfJoining { get; set; }
        public DateTime? DateOfLeaving { get; set; }
        public string RoleName { get; set; }
        public string DepartmentName { get; set; }
    }

}