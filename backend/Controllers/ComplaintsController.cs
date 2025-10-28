// Updated Controller: Store relative paths, return full URLs in responses
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using minutechart.Data;
using minutechart.Models;
using minutechart.Helpers;
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace minutechart.Controllers.Api
{
    [ApiController]
    [Route("api/[controller]")]
    public class ComplaintsController : ControllerBase
    {
        private readonly MinutechartDbContext _db;
        private readonly UserManager<AppUser> _userManager;
        private readonly string _uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");

        public ComplaintsController(MinutechartDbContext db, UserManager<AppUser> userManager)
        {
            _db = db;
            _userManager = userManager;
            Directory.CreateDirectory(_uploadsFolder);
        }

        // User submits a complaint with attachments
        [Authorize]
        [HttpPost("submit")]
        public async Task<IActionResult> SubmitComplaint([FromForm] ComplaintDto dto)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var attachmentUrls = await SaveFiles(dto.Attachments, Request);

            var complaint = new Complaint
            {
                Title = dto.Title,
                Description = dto.Description,
                Category = dto.Category,
                AppUserId = user.Id,
                UserAttachmentUrls = attachmentUrls.Any() ? string.Join(",", attachmentUrls) : null
            };

            _db.Complaints.Add(complaint);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Complaint submitted successfully", id = complaint.Id });
        }

        // Updated GetMyComplaints (include CustomerCode for user's own profile)
        [Authorize]
        [HttpGet("my-complaints")]
        public async Task<IActionResult> GetMyComplaints()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var complaints = await _db.Complaints
                .Where(c => c.AppUserId == user.Id)
                .Include(c => c.AppUser)
                    .ThenInclude(u => u.UserProfile)  // Include UserProfile for CustomerCode
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();

            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            return Ok(complaints.Select(c => new
            {
                c.Id,
                c.Title,
                c.Description,
                c.Category,
                c.Status,
                c.AdminResponse,
                c.CreatedAt,
                c.UpdatedAt,
                CustomerCode = c.AppUser?.UserProfile?.CustomerCode ?? "N/A",  // Add CustomerCode
                UserAttachmentUrls = c.UserAttachmentUrls?.Split(',')
                    .Select(url => url.StartsWith("http") ? url : $"{baseUrl}{url}")
                    .ToArray() ?? new string[0],
                AdminAttachmentUrls = c.AdminAttachmentUrls?.Split(',')
                    .Select(url => url.StartsWith("http") ? url : $"{baseUrl}{url}")
                    .ToArray() ?? new string[0]
            }));
        }

        // Updated GetAllComplaints (include CustomerCode for all users)
        [Authorize(Roles = "Admin")]
        [HttpGet("all")]
        public async Task<IActionResult> GetAllComplaints()
        {
            var complaints = await _db.Complaints
                .Include(c => c.AppUser)
                    .ThenInclude(u => u.UserProfile)  // Include UserProfile for CustomerCode
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();

            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            return Ok(complaints.Select(c => new
            {
                c.Id,
                c.Title,
                c.Description,
                c.Category,
                c.Status,
                c.AdminResponse,
                c.CreatedAt,
                c.UpdatedAt,
                UserName = c.AppUser?.CustomerName ?? c.AppUser?.UserName,
                UserEmail = c.AppUser?.Email,
                CustomerCode = c.AppUser?.UserProfile?.CustomerCode ?? "N/A",  // Add CustomerCode
                UserAttachmentUrls = c.UserAttachmentUrls?.Split(',')
                    .Select(url => url.StartsWith("http") ? url : $"{baseUrl}{url}")
                    .ToArray() ?? new string[0],
                AdminAttachmentUrls = c.AdminAttachmentUrls?.Split(',')
                    .Select(url => url.StartsWith("http") ? url : $"{baseUrl}{url}")
                    .ToArray() ?? new string[0]
            }));
        }

        // Admin updates a complaint (construct full URLs)
        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateComplaint(int id, [FromForm] UpdateComplaintDto dto)
        {
            var complaint = await _db.Complaints.FindAsync(id);
            if (complaint == null) return NotFound();

            var adminAttachmentUrls = await SaveFiles(dto.AdminAttachments, Request);

            if (!string.IsNullOrEmpty(dto.Status)) complaint.Status = dto.Status;
            if (dto.AdminResponse != null) complaint.AdminResponse = dto.AdminResponse;
            if (adminAttachmentUrls.Any()) complaint.AdminAttachmentUrls = string.Join(",", adminAttachmentUrls);  // Store relative paths
            complaint.UpdatedAt = DateTimeHelper.GetIndianTime();

            _db.Complaints.Update(complaint);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Complaint updated successfully" });
        }

        // Admin deletes a complaint (unchanged)
        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteComplaint(int id)
        {
            var complaint = await _db.Complaints.FindAsync(id);
            if (complaint == null) return NotFound();

            _db.Complaints.Remove(complaint);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Complaint deleted successfully" });
        }

        // Helper: Save files and return relative URLs
        private async Task<List<string>> SaveFiles(IFormFileCollection files, HttpRequest request)
        {
            var urls = new List<string>();
            foreach (var file in files ?? new FormFileCollection())
            {
                if (file.Length > 5 * 1024 * 1024) continue;
                var allowedTypes = new[] { "image/jpeg", "image/png" };
                if (!allowedTypes.Contains(file.ContentType)) continue;

                var fileName = $"{Guid.NewGuid()}_{file.FileName}";
                var filePath = Path.Combine(_uploadsFolder, fileName);
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }
                urls.Add($"/uploads/{fileName}");  // Return relative path
            }
            return urls;
        }
    }

    // DTOs (unchanged)
    public class ComplaintDto
    {
        public string? Title { get; set; }
        public string? Description { get; set; }
        public string? Category { get; set; }
        public IFormFileCollection? Attachments { get; set; }
    }

    public class UpdateComplaintDto
    {
        public string? Status { get; set; }
        public string? AdminResponse { get; set; }
        public IFormFileCollection? AdminAttachments { get; set; }
    }
}