using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using minutechart.Models;
using minutechart.Data;
using minutechart.ViewModels;
using Microsoft.EntityFrameworkCore;
using minutechart.Services;
using minutechart.Helpers;
using System.Net;
namespace minutechart.Controllers.Api
{
    [ApiController]
    [Route("api/[controller]")]
    public class AccountController : ControllerBase
    {
        private readonly SignInManager<AppUser> _signInManager;
        private readonly UserManager<AppUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly MinutechartDbContext _mainDb;
        private readonly IConfiguration _configuration;
        private readonly IEmailSender _emailSender;
        private readonly ActivityLogger _activityLogger;


        public AccountController(
            SignInManager<AppUser> signInManager,
            UserManager<AppUser> userManager,
            RoleManager<IdentityRole> roleManager,
            MinutechartDbContext mainDb,
            IConfiguration configuration,
            IEmailSender emailSender,
            ActivityLogger activityLogger)
        {
            _signInManager = signInManager;
            _userManager = userManager;
            _roleManager = roleManager;
            _mainDb = mainDb;
            _configuration = configuration;
            _emailSender = emailSender;
            _activityLogger = activityLogger;
        }

        // --- Helper to get user context for logging when target user is different from actor ---
        private async Task<string> GetTargetUserNameById(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            return user?.UserName;
        }

        // -------------------- REGISTER --------------------
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] AuthViewModel model)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { errors = ModelState });

            var existingUser = await _userManager.FindByEmailAsync(model.Email);

            if (existingUser != null)
            {
                if (!existingUser.EmailConfirmed)
                {
                    await _userManager.UpdateSecurityStampAsync(existingUser);

                    var token = await _userManager.GenerateEmailConfirmationTokenAsync(existingUser);
                    existingUser.EmailConfirmationTokenGeneratedAt = DateTimeHelper.GetIndianTime();
                    await _userManager.UpdateAsync(existingUser);

                    var encodedToken = WebUtility.UrlEncode(token);
                    var confirmationLink = Url.Action("ConfirmEmail", "Account",
                        new { userId = existingUser.Id, token = encodedToken }, Request.Scheme);

                    var subject = "Ngraph Registration Confirmation";
                    var plainText = $"Please confirm your email by clicking this link: {confirmationLink}";
                    var htmlContent = $@"
                <p>Hello {existingUser.CustomerName},</p>
                <p>You already registered but didn't confirm your email. Please click the link below to verify your account:</p>
                <a href='{confirmationLink}'>Confirm Email</a>";

                    // await _emailSender.SendEmailAsync(existingUser.Email, subject, plainText, htmlContent);
                    await _activityLogger.LogAsync("resent confirmation email for", "User", existingUser.UserName);
                    return Ok(new
                    {
                        message = "You already registered but didn’t confirm your email. A new confirmation email has been sent."
                    });
                }
                else
                {
                    // LOG: Failed Registration (Email exists)
                    await _activityLogger.LogAsync("failed registration: email exists", "User", model.Email);
                    return BadRequest(new { message = "Email already exists." });
                }
            }

            var user = new AppUser
            {
                CompanyName = model.CompanyName ?? "",
                CustomerName = model.CustomerName,
                PhoneNumber = model.PhoneNumber,
                UserName = model.Email,
                Email = model.Email,
                GST = model.GST,
                RegistrationDate = DateTimeHelper.GetIndianTime(),
                EmailConfirmed = false,
                AccountStatus = "Pending"
            };

            var result = await _userManager.CreateAsync(user, model.Password);
            if (!result.Succeeded)
            {
                // LOG: Failed Registration (Identity Error)
                await _activityLogger.LogAsync("failed registration: identity error", "User", model.Email);
                return BadRequest(new { errors = result.Errors });
            }

            if (!await _roleManager.RoleExistsAsync("User"))
                await _roleManager.CreateAsync(new IdentityRole("User"));

            await _userManager.AddToRoleAsync(user, "User");
            await _userManager.UpdateSecurityStampAsync(user);

            var tokenNew = await _userManager.GenerateEmailConfirmationTokenAsync(user);
            user.EmailConfirmationTokenGeneratedAt = DateTimeHelper.GetIndianTime();
            await _userManager.UpdateAsync(user);

            var encodedTokenNew = WebUtility.UrlEncode(tokenNew);
            var confirmationLinkNew = Url.Action("ConfirmEmail", "Account",
                new { userId = user.Id, token = encodedTokenNew }, Request.Scheme);

            var subjectNew = "Ngraph - Email Confirmation";
            var plainTextNew = $"Please confirm your email by clicking this link: {confirmationLinkNew}";

            var htmlContentNew = $@"
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset='UTF-8'>
                    <meta name='viewport' content='width=device-width, initial-scale=1'>
                    <title>Email Confirmation</title>
                </head>
                <body style='font-family: Arial, sans-serif; background-color: #ffffff; color: #000000;'>
                    <p>Hello,</p>
                    <p>Thank you for registering with Ngraph.</p>
                    <p>Please confirm your email by clicking the link below:</p>
                    <p><a href='{confirmationLinkNew}' style='color: #1a73e8;'>Confirm Email</a></p>
                    <p>If you did not create an account, you can safely ignore this email.</p>
                    <br/>
                    <p>— The Ngraph Team</p>
                </body>
                </html>";

            // await _emailSender.SendEmailAsync(user.Email, subjectNew, plainTextNew, htmlContentNew);
            // LOG: Successful Registration
            await _activityLogger.LogAsync("registered new account", "User", user.UserName);
            return Ok(new
            {
                message = "Registration successful! Please confirm your email and wait for admin approval before logging in."
            });
        }

        // -------------------- CONFIRM EMAIL --------------------
        [HttpGet("confirm-email")]
        public async Task<IActionResult> ConfirmEmail(string userId, string token)
        {
            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(token))
                return BadRequest("Invalid email confirmation request.");

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                // LOG: Failed Confirmation (User not found)
                await _activityLogger.LogAsync("failed email confirmation: user not found", "User ID", userId);
                return NotFound("User not found.");
            }

            if (user.EmailConfirmationTokenGeneratedAt.HasValue)
            {
                var tokenIssuedAt = user.EmailConfirmationTokenGeneratedAt.Value;
                var tokenLifetime = TimeSpan.FromHours(1);

                if ((DateTimeHelper.GetIndianTime() - tokenIssuedAt) > tokenLifetime)
                {
                    return BadRequest(new { message = "This confirmation link has expired. Please request a new one." });
                }
            }

            var decodedToken = WebUtility.UrlDecode(token);

            var result = await _userManager.ConfirmEmailAsync(user, decodedToken);
            if (result.Succeeded)
            {
                // LOG: Successful Email Confirmation
                await _activityLogger.LogAsync("confirmed email address", "User", user.UserName);

                var loginUrl = $"{_configuration["Frontend:LoginUrl"]}?emailConfirmed=true";
                return Redirect(loginUrl);
            }

            // LOG: Failed Email Confirmation
            await _activityLogger.LogAsync("failed email confirmation: token invalid/expired", "User", user.UserName);
            return BadRequest(new { message = "Email confirmation failed." });
        }

        // -------------------- RESEND CONFIRMATION --------------------
        [HttpPost("resend-confirmation")]
        public async Task<IActionResult> ResendConfirmation([FromBody] ResendConfirmationViewModel model)
        {
            if (string.IsNullOrWhiteSpace(model.Email))
                return BadRequest(new { message = "Email is required." });

            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null)
            {
                // LOG: Failed Resend (User not found)
                await _activityLogger.LogAsync("failed to resend confirmation: user not found", "Email", model.Email);
                return NotFound(new { message = "User not found." });
            }

            if (user.EmailConfirmed)
            {
                // LOG: Failed Resend (Already Confirmed)
                await _activityLogger.LogAsync("failed to resend confirmation: already confirmed", "User", user.UserName);
                return BadRequest(new { message = "Email is already confirmed." });
            }

            var minInterval = TimeSpan.FromMinutes(2);
            if (user.EmailConfirmationTokenGeneratedAt.HasValue &&
                (DateTimeHelper.GetIndianTime() - user.EmailConfirmationTokenGeneratedAt.Value) < minInterval)
            {
                return BadRequest(new { message = "Please wait a bit before requesting another confirmation email." });
            }

            await _userManager.UpdateSecurityStampAsync(user);

            var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
            user.EmailConfirmationTokenGeneratedAt = DateTimeHelper.GetIndianTime();
            await _userManager.UpdateAsync(user);

            var encodedToken = WebUtility.UrlEncode(token);
            var confirmationLink = Url.Action("ConfirmEmail", "Account",
                new { userId = user.Id, token = encodedToken }, Request.Scheme);

            var subject = "Ngraph Registration Confirmation";
            var plainText = $"Please confirm your email by clicking this link: {confirmationLink}";
            var htmlContent = $"<p>Please confirm your email by clicking <a href='{confirmationLink}'>here</a>.</p>";

            // await _emailSender.SendEmailAsync(user.Email, subject, plainText, htmlContent);
            // LOG: Resent Confirmation Email
            await _activityLogger.LogAsync("resent confirmation email", "User", user.UserName);

            return Ok(new { message = "A new confirmation email has been sent." });
        }

        // -------------------- FORGOT PASSWORD --------------------
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordViewModel model)
        {
            if (string.IsNullOrWhiteSpace(model.Email))
                return BadRequest(new { message = "Email is required." });

            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null)
            {
                // LOG: Failed Forgot Password (User not found)
                await _activityLogger.LogAsync("failed forgot password request: user not found", "Email", model.Email);
                return NotFound(new { message = "User not found." });
            }

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var frontendUrl = _configuration["Frontend:ResetPasswordUrl"];
            var resetLink = $"{frontendUrl}?userId={user.Id}&token={Uri.EscapeDataString(token)}";

            var subject = "Reset Your Password - Ngraph";
            var plainText = $"You requested a password reset. Click this link to reset your password: {resetLink}";

            var htmlContent = $@"
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset='UTF-8'>
                    <meta name='viewport' content='width=device-width, initial-scale=1'>
                    <title>Reset Your Password - Ngraph</title>
                </head>
                <body>
                <div style='max-width:600px;margin:40px auto;background:#0f172a;padding:30px;border-radius:12px;text-align:center;'>
                    <h2 style='color:white;'>Reset Your Password!</h2>
                    <p style='color:white;'>Click below to reset your password:</p>
                    <a href='{resetLink}' style='display:inline-block;background:#ffffff;color:#0f172a;
                        padding:14px 28px;border-radius:6px;font-size:16px;font-weight:bold;text-decoration:none;'>Reset Password</a>
                    <p style='color:#aaa;margin-top:20px;'>If you didn’t request this, ignore this email.</p>
                </div>
                </body>
                </html>";

            // await _emailSender.SendEmailAsync(user.Email, subject, plainText, htmlContent);

            // LOG: Forgot Password Link Sent
            await _activityLogger.LogAsync("requested password reset link", "User", user.UserName);

            return Ok(new { message = "Password reset link has been sent to your email." });
        }

        // -------------------- RESET PASSWORD --------------------
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordViewModel model)
        {
            if (string.IsNullOrEmpty(model.UserId) || string.IsNullOrEmpty(model.Token))
                return BadRequest(new { message = "Invalid reset request." });

            var user = await _userManager.FindByIdAsync(model.UserId);
            if (user == null)
            {
                // LOG: Failed Reset (User not found)
                await _activityLogger.LogAsync("failed password reset: user not found", "User ID", model.UserId);
                return NotFound(new { message = "User not found." });
            }

            var result = await _userManager.ResetPasswordAsync(user, model.Token, model.NewPassword);
            if (result.Succeeded)
            {
                // LOG: Successful Password Reset
                await _activityLogger.LogAsync("successfully reset password", "User", user.UserName);
                return Ok(new { message = "Password has been reset successfully." });
            }

            // LOG: Failed Password Reset (Identity error/bad token)
            await _activityLogger.LogAsync("failed password reset: token or password invalid", "User", user.UserName);
            return BadRequest(new { message = "Password reset failed.", errors = result.Errors });
        }

        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordViewModel model)
        {
            if (string.IsNullOrWhiteSpace(model.CurrentPassword) ||
                string.IsNullOrWhiteSpace(model.NewPassword) ||
                string.IsNullOrWhiteSpace(model.ConfirmNewPassword))
            {
                return BadRequest(new { message = "All fields are required." });
            }

            if (model.NewPassword != model.ConfirmNewPassword)
            {
                return BadRequest(new { message = "New passwords do not match." });
            }

            var user = await _userManager.GetUserAsync(User);
            if (user == null)
                return Unauthorized();

            var result = await _userManager.ChangePasswordAsync(user, model.CurrentPassword, model.NewPassword);
            if (result.Succeeded)
            {
                // LOG: Successful Password Change
                await _activityLogger.LogAsync("changed password successfully", "User", user.UserName);
                return Ok(new { message = "Password updated successfully." });
            }

            // LOG: Failed Password Change (Wrong current password)
            await _activityLogger.LogAsync("failed to change password: current password incorrect", "User", user.UserName);
            return BadRequest(new { message = "Password update failed.", errors = result.Errors });
        }


        // ------------------ LOGIN ------------------
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginViewModel model)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { errors = ModelState });

            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null)
            {
                // LOG: Failed Login (User not found)
                await _activityLogger.LogAsync("failed login attempt: user not found", "Email", model.Email);
                return BadRequest(new { message = "User not found" });
            }

            if (user.AccountStatus == "Pending" || user.AccountStatus == "Blocked")
            {
                // LOG: Failed Login (Account restricted)
                await _activityLogger.LogAsync($"failed login attempt: status {user.AccountStatus}", "User", user.UserName);
                return BadRequest(new
                {
                    message = user.AccountStatus == "Pending" ?
                    "Your account is pending activation by admin." :
                    "Your account is blocked by admin."
                });
            }

            var result = await _signInManager.PasswordSignInAsync(user.UserName, model.Password, true, false);
            if (!result.Succeeded)
            {
                // LOG: Failed Login (Bad credentials)
                await _activityLogger.LogAsync("failed login attempt: bad credentials", "User", user.UserName);
                return BadRequest(new { message = "Invalid login attempt" });
            }

            // LOG: Successful Login
            await _activityLogger.LogAsync("successfully logged in", "User", user.UserName);

            var roles = await _userManager.GetRolesAsync(user);

            return Ok(new
            {
                message = "Login successful",
                user = new
                {
                    user.Email,
                    user.CompanyName,
                    user.AccountStatus,
                    Roles = roles
                }
            });
        }

        // ------------------ LOGOUT ------------------
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            // Fetch the user before signing out, as context is lost after sign-out
            var user = await _userManager.GetUserAsync(User);
            var userName = user?.UserName ?? "Unknown";

            await _signInManager.SignOutAsync();

            // LOG: Successful Logout
            await _activityLogger.LogAsync("logged out", "User", userName);

            return Ok(new { message = "Logged out successfully" });
        }

        // ------------------ GET CURRENT USER ------------------
        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentUser()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var roles = await _userManager.GetRolesAsync(user);

            return Ok(new
            {
                user.Id,
                user.UserName,
                user.CompanyName,
                user.GST,
                user.AdminName,
                user.Email,
                user.AccountStatus,
                Roles = roles
            });
        }

        [HttpGet("my-profile")]
        public async Task<IActionResult> GetMyProfile()
        {
            var user = await _userManager.GetUserAsync(User);

            if (user == null)
                return Unauthorized(new { message = "User not found" });

            var profile = await _mainDb.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == user.Id);

            var dto = new UserProfileDto
            {
                ProfilePhotoUrl = profile?.ProfilePhotoUrl ?? "",
                CompanyLogoUrl = profile?.CompanyLogoUrl ?? "",
                CompanyName = user.CompanyName ?? "",
                CustomerName = user.CustomerName ?? "",
                Email = user.UserName ?? "",
                PhoneNumber = user.PhoneNumber ?? "",
                ServerName = profile?.ServerName ?? "",
                DatabaseName = profile?.DatabaseName ?? "",
                DbUsername = profile?.DbUsername ?? "",
                DbPassword = profile?.DbPassword ?? "",
                CustomerGST = profile?.CustomerGST ?? user.GST ?? "",
                CustomerCode = profile?.CustomerCode ?? ""
            };

            return Ok(dto);
        }

        [HttpPost("upload-profile-photo")]
        public async Task<IActionResult> UploadProfilePhoto([FromForm] IFormFile file)
        {
            var user = await _userManager.GetUserAsync(User);

            if (user == null)
                return Unauthorized(new { message = "User not found" });

            var profile = await _mainDb.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == user.Id);

            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file selected." });

            string uploadPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "profile");

            if (!Directory.Exists(uploadPath))
                Directory.CreateDirectory(uploadPath);

            string fileName = $"{user.Id}_{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            string filePath = Path.Combine(uploadPath, fileName);

            // Save the file
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            string baseUrl = $"{Request.Scheme}://{Request.Host}";
            string newPhotoUrl = $"{baseUrl}/uploads/profile/{fileName}";

            profile.ProfilePhotoUrl = newPhotoUrl;

            await _mainDb.SaveChangesAsync();

            return Ok(new { newUrl = newPhotoUrl, message = "Profile photo updated" });
        }

        [HttpPost("upload-company-logo")]
        public async Task<IActionResult> UploadCompanyLogo([FromForm] IFormFile file)
        {
            var user = await _userManager.GetUserAsync(User);

            if (user == null)
                return Unauthorized(new { message = "User not found" });

            var profile = await _mainDb.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == user.Id);

            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file selected." });

            string uploadPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "profile");

            if (!Directory.Exists(uploadPath))
                Directory.CreateDirectory(uploadPath);

            string fileName = $"{user.Id}_{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            string filePath = Path.Combine(uploadPath, fileName);

            // Save the file
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            string baseUrl = $"{Request.Scheme}://{Request.Host}";
            string newPhotoUrl = $"{baseUrl}/uploads/profile/{fileName}";

            profile.CompanyLogoUrl = newPhotoUrl;

            await _mainDb.SaveChangesAsync();

            return Ok(new { newUrl = newPhotoUrl, message = "Company Logo updated" });
        }

        [HttpPut("save-profile")]
        public async Task<IActionResult> SaveProfile([FromBody] SaveProfileDto dto)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
                return Unauthorized(new { message = "User not found" });

            user.CompanyName = dto.CompanyName;
            user.CustomerName = dto.CustomerName;
            user.PhoneNumber = dto.PhoneNumber;
            user.GST = dto.GST;

            var profile = await _mainDb.UserProfiles.FirstOrDefaultAsync(p => p.AppUserId == user.Id);
            if (profile != null)
            {
                profile.CompanyName = dto.CompanyName;
                profile.CustomerGST = dto.GST;
            }

            await _userManager.UpdateAsync(user);
            await _mainDb.SaveChangesAsync();

            return Ok(new { message = "Profile updated successfully" });
        }

        public class SaveProfileDto
        {
            public string CompanyName { get; set; } = "";
            public string CustomerName { get; set; } = "";
            public string PhoneNumber { get; set; } = "";
            public string GST { get; set; } = "";
        }
        
    }
}
