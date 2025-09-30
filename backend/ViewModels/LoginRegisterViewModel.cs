using System.ComponentModel.DataAnnotations;

namespace minutechart.ViewModels
{
    public class LoginRegisterViewModel
    {
        public LoginViewModel Login { get; set; } = new LoginViewModel();
        public RegisterViewModel Register { get; set; } = new RegisterViewModel();
    }
}


// namespace minutechart.ViewModels
// {
//     public class LoginRegisterViewModel
//     {
//         public LoginViewModel Login { get; set; } = new LoginViewModel();
//         public RegisterViewModel Register { get; set; } = new RegisterViewModel();
//     }

//     public class LoginViewModel
//     {
//         [Required]
//         [EmailAddress]
//         public string Email { get; set; }

//         [Required]
//         [DataType(DataType.Password)]
//         public string Password { get; set; }
//     }

//     public class RegisterViewModel
//     {
//         [Required]
//         public string FullName { get; set; }

//         [Required]
//         [EmailAddress]
//         public string Email { get; set; }

//         [Required]
//         [DataType(DataType.Password)]
//         public string Password { get; set; }

//         [Required]
//         [Compare("Password", ErrorMessage = "Passwords do not match")]
//         [DataType(DataType.Password)]
//         public string ConfirmPassword { get; set; }
//     }

// }