using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using minutechart.Models;
using minutechart.Data;
using minutechart.ViewModels;
using Microsoft.EntityFrameworkCore;
using minutechart.Services;
using System.Net;
using Microsoft.IdentityModel.Tokens;
using System.Text;
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

        public AccountController(
            SignInManager<AppUser> signInManager,
            UserManager<AppUser> userManager,
            RoleManager<IdentityRole> roleManager,
            MinutechartDbContext mainDb,
            IConfiguration configuration,
            IEmailSender emailSender)
        {
            _signInManager = signInManager;
            _userManager = userManager;
            _roleManager = roleManager;
            _mainDb = mainDb;
            _configuration = configuration;
            _emailSender = emailSender;
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
                    existingUser.EmailConfirmationTokenGeneratedAt = DateTime.UtcNow;
                    await _userManager.UpdateAsync(existingUser);

                    var encodedToken = WebUtility.UrlEncode(token);
                    var confirmationLink = Url.Action("ConfirmEmail", "Account",
                        new { userId = existingUser.Id, token = encodedToken }, Request.Scheme);

                    var subject = "Nchart Registration Confirmation";
                    var plainText = $"Please confirm your email by clicking this link: {confirmationLink}";
                    var htmlContent = $@"
                <p>Hello {existingUser.CustomerName},</p>
                <p>You already registered but didn't confirm your email. Please click the link below to verify your account:</p>
                <a href='{confirmationLink}'>Confirm Email</a>";

                    await _emailSender.SendEmailAsync(existingUser.Email, subject, plainText, htmlContent);

                    return Ok(new
                    {
                        message = "You already registered but didn’t confirm your email. A new confirmation email has been sent."
                    });
                }
                else
                {
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
                EmailConfirmed = false,
                AccountStatus = "Pending"
            };

            var result = await _userManager.CreateAsync(user, model.Password);
            if (!result.Succeeded)
                return BadRequest(new { errors = result.Errors });

            if (!await _roleManager.RoleExistsAsync("User"))
                await _roleManager.CreateAsync(new IdentityRole("User"));

            await _userManager.AddToRoleAsync(user, "User");
            await _userManager.UpdateSecurityStampAsync(user);

            var tokenNew = await _userManager.GenerateEmailConfirmationTokenAsync(user);
            user.EmailConfirmationTokenGeneratedAt = DateTime.UtcNow;
            await _userManager.UpdateAsync(user);

            var encodedTokenNew = WebUtility.UrlEncode(tokenNew);
            var confirmationLinkNew = Url.Action("ConfirmEmail", "Account",
                new { userId = user.Id, token = encodedTokenNew }, Request.Scheme);

            var subjectNew = "Nchart - Email Confirmation";
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
                    <p>Thank you for registering with Nchart.</p>
                    <p>Please confirm your email by clicking the link below:</p>
                    <p><a href='{confirmationLinkNew}' style='color: #1a73e8;'>Confirm Email</a></p>
                    <p>If you did not create an account, you can safely ignore this email.</p>
                    <br/>
                    <p>— The Nchart Team</p>
                </body>
                </html>";

            await _emailSender.SendEmailAsync(user.Email, subjectNew, plainTextNew, htmlContentNew);

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
                return NotFound("User not found.");

            if (user.EmailConfirmationTokenGeneratedAt.HasValue)
            {
                var tokenIssuedAt = user.EmailConfirmationTokenGeneratedAt.Value;
                var tokenLifetime = TimeSpan.FromHours(1);

                if ((DateTime.UtcNow - tokenIssuedAt) > tokenLifetime)
                {
                    return BadRequest(new { message = "This confirmation link has expired. Please request a new one." });
                }
            }

            var decodedToken = WebUtility.UrlDecode(token);

            var result = await _userManager.ConfirmEmailAsync(user, decodedToken);
            if (result.Succeeded)
            {
                var loginUrl = $"{_configuration["Frontend:LoginUrl"]}?emailConfirmed=true";
                return Redirect(loginUrl);
            }

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
                return NotFound(new { message = "User not found." });

            if (user.EmailConfirmed)
                return BadRequest(new { message = "Email is already confirmed." });

            var minInterval = TimeSpan.FromMinutes(2);
            if (user.EmailConfirmationTokenGeneratedAt.HasValue &&
                (DateTime.UtcNow - user.EmailConfirmationTokenGeneratedAt.Value) < minInterval)
            {
                return BadRequest(new { message = "Please wait a bit before requesting another confirmation email." });
            }

            await _userManager.UpdateSecurityStampAsync(user);

            var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
            user.EmailConfirmationTokenGeneratedAt = DateTime.UtcNow;
            await _userManager.UpdateAsync(user);

            var encodedToken = WebUtility.UrlEncode(token);
            var confirmationLink = Url.Action("ConfirmEmail", "Account",
                new { userId = user.Id, token = encodedToken }, Request.Scheme);

            var subject = "Nchart Registration Confirmation";
            var plainText = $"Please confirm your email by clicking this link: {confirmationLink}";
            var htmlContent = $"<p>Please confirm your email by clicking <a href='{confirmationLink}'>here</a>.</p>";

            await _emailSender.SendEmailAsync(user.Email, subject, plainText, htmlContent);

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
                return NotFound(new { message = "User not found." });

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var frontendUrl = _configuration["Frontend:ResetPasswordUrl"];
            var resetLink = $"{frontendUrl}?userId={user.Id}&token={Uri.EscapeDataString(token)}";

            var subject = "Reset Your Password - Nchart";
            var plainText = $"You requested a password reset. Click this link to reset your password: {resetLink}";

            var htmlContent = $@"
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset='UTF-8'>
                    <meta name='viewport' content='width=device-width, initial-scale=1'>
                    <title>Reset Your Password - Nchart</title>
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

            await _emailSender.SendEmailAsync(user.Email, subject, plainText, htmlContent);

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
                return NotFound(new { message = "User not found." });

            var result = await _userManager.ResetPasswordAsync(user, model.Token, model.NewPassword);
            if (result.Succeeded)
                return Ok(new { message = "Password has been reset successfully." });

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
                return Ok(new { message = "Password updated successfully." });

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
                return BadRequest(new { message = "User not found" });

            if (user.AccountStatus == "Pending")
                return BadRequest(new { message = "Your account is pending activation by admin." });
            if (user.AccountStatus == "Blocked")
                return BadRequest(new { message = "Your account is blocked by admin." });

            var result = await _signInManager.CheckPasswordSignInAsync(user, model.Password, false);
            if (!result.Succeeded)
                return BadRequest(new { message = "Invalid login attempt" });

            var roles = await _userManager.GetRolesAsync(user);

            // Generate JWT
            var jwtKey = _configuration["Jwt:Key"];
            var jwtIssuer = _configuration["Jwt:Issuer"];

            var tokenHandler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(jwtKey);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new System.Security.Claims.ClaimsIdentity(new[]
                {
            new System.Security.Claims.Claim("id", user.Id),
            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Email, user.Email),
            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Name, user.UserName),
            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, string.Join(",", roles))
        }),
                Expires = DateTime.UtcNow.AddDays(7),
                Issuer = jwtIssuer,
                Audience = jwtIssuer,
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            var jwt = tokenHandler.WriteToken(token);

            return Ok(new
            {
                message = "Login successful",
                token = jwt,
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
            await _signInManager.SignOutAsync();
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
                user.UserName,
                user.CompanyName,
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
                CompanyName = user.CompanyName,
                ServerName = profile?.ServerName ?? "",
                DatabaseName = profile?.DatabaseName ?? "",
                DbUsername = profile?.DbUsername ?? "",
                DbPassword = profile?.DbPassword ?? "",
                RefreshTime = profile?.RefreshTime ?? 60000
            };

            return Ok(dto);
        }

    }
}
