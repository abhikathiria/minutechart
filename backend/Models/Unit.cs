// using System;
// using System.Collections.Generic;
// using System.ComponentModel.DataAnnotations;
// using System.ComponentModel.DataAnnotations.Schema;

// namespace minutechart.Models
// {
//     public class Unit
//     {
//         [Key]
//         public int UnitID { get; set; }
        
//         [StringLength(20)]
//         public string? UnitCode { get; set; }
        
//         [Required]
//         [StringLength(100)]
//         public string UnitName { get; set; }
        
//         [Required]
//         [StringLength(50)]
//         public string UnitHeadName { get; set; }
        
//         [Required]
//         [StringLength(20)]
//         public string UnitHeadContactNumber { get; set; }
        
//         [StringLength(100)]
//         public string UnitHeadEmail { get; set; }
        
//         public int NumberOfEmployees { get; set; } = 0;
        
//         [ForeignKey("Department")]
//         public int DepartmentID { get; set; }

//         public Department? Department { get; set; }

//         public void GenerateUnitCode(int? nextUnitNumber = null, string? departmentCode = null)
//         {
//             if (string.IsNullOrEmpty(departmentCode) || nextUnitNumber == null) return;

//             UnitCode = $"{departmentCode}U{nextUnitNumber}";
//         }


//     }
// }