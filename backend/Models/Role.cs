// using System.ComponentModel.DataAnnotations;
// using System.ComponentModel.DataAnnotations.Schema;
// using System.Text.RegularExpressions;

// namespace minutechart.Models
// {
//     public class Role
//     {
//         [Key]
//         public int RoleID { get; set; }

//         [StringLength(20)]
//         public string? RoleCode { get; set; }  // Nullable but will be set before saving

//         [Required]
//         [StringLength(100)]
//         public string RoleName { get; set; } = null!;

//         public int NumberOfEmployees { get; set; } = 0;

//         public virtual ICollection<Employee> Employees { get; set; } = new List<Employee>();

//         // Method to generate RoleCode
//         public void GenerateRoleCode(int? nextRoleId = null)
//         {
//             if (string.IsNullOrWhiteSpace(RoleName))
//             {
//                 RoleCode = $"ROLE{nextRoleId}";
//                 return;
//             }

//             string[] words = RoleName.Split(' ');
//             string roleCode = "";

//             foreach (var word in words)
//             {
//                 // Ignore small words like "and"
//                 if (!string.IsNullOrEmpty(word) && word.ToLower() != "and")
//                 {
//                     // If the word is fully uppercase and ≤ 4 characters, take the full word
//                     if (word.Length <= 4 && word == word.ToUpper() && Regex.IsMatch(word, "[A-Z]"))
//                     {
//                         roleCode += word;
//                     }
//                     else
//                     {
//                         roleCode += char.ToUpper(word[0]); // Take the first letter otherwise
//                     }
//                 }
//             }

//             RoleCode = roleCode.Length > 0 ? roleCode : $"ROLE{nextRoleId}";
//         }
//     }
// }
