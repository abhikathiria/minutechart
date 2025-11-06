using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using minutechart.Data;
using minutechart.Models;
using minutechart.Helpers;
using minutechart.Services;
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic; // Added for List<string>

namespace minutechart.Controllers.Api
{
    [ApiController]
    [Route("api/[controller]")]
    public class ComplaintsController : ControllerBase
    {
        private readonly MinutechartDbContext _db;
        private readonly UserManager<AppUser> _userManager;
        private readonly ActivityLogger _activityLogger;

        private readonly string _uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");

        public ComplaintsController(MinutechartDbContext db, UserManager<AppUser> userManager, ActivityLogger activityLogger)
        {
            _db = db;
            _userManager = userManager;
            _activityLogger = activityLogger;
            Directory.CreateDirectory(_uploadsFolder);
        }

        // -------------------- USER ACTIONS --------------------

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
                UserAttachmentUrls = attachmentUrls.Any() ? string.Join(",", attachmentUrls) : null,
                // Default status is usually 'Open' or 'Submitted'
                Status = "Open", 
                CreatedAt = DateTimeHelper.GetIndianTime(),
                UpdatedAt = DateTimeHelper.GetIndianTime()
            };

            _db.Complaints.Add(complaint);
            await _db.SaveChangesAsync();

            // LOG: User submitted a new complaint
            await _activityLogger.LogAsync("submitted new complaint", "Complaint", complaint.Title, user.UserName ?? user.Email);

            return Ok(new { message = "Complaint submitted successfully", id = complaint.Id });
        }

        // Updated GetMyComplaints (Read-only, no log needed)
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
                UserAttachmentUrls = c.UserAttachmentUrls?.Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(url => url.StartsWith("http") ? url : $"{baseUrl}{url.Trim()}")
                    .ToArray() ?? new string[0],
                AdminAttachmentUrls = c.AdminAttachmentUrls?.Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(url => url.StartsWith("http") ? url : $"{baseUrl}{url.Trim()}")
                    .ToArray() ?? new string[0]
            }));
        }
        
        // -------------------- ADMIN ACTIONS --------------------

        // Updated GetAllComplaints (Read-only, no log needed)
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
                UserAttachmentUrls = c.UserAttachmentUrls?.Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(url => url.StartsWith("http") ? url : $"{baseUrl}{url.Trim()}")
                    .ToArray() ?? new string[0],
                AdminAttachmentUrls = c.AdminAttachmentUrls?.Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(url => url.StartsWith("http") ? url : $"{baseUrl}{url.Trim()}")
                    .ToArray() ?? new string[0]
            }));
        }

        // Admin updates a complaint (construct full URLs)
        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateComplaint(int id, [FromForm] UpdateComplaintDto dto)
        {
            var complaint = await _db.Complaints
                .Include(c => c.AppUser)
                .FirstOrDefaultAsync(c => c.Id == id);
            
            if (complaint == null) return NotFound();

            // Capture old status for logging comparison
            var oldStatus = complaint.Status;
            var targetUserName = complaint.AppUser?.UserName ?? complaint.AppUser?.Email ?? "N/A";

            var adminAttachmentUrls = await SaveFiles(dto.AdminAttachments, Request);
            bool responseUpdated = dto.AdminResponse != null && complaint.AdminResponse != dto.AdminResponse;
            
            // --- Apply Updates ---
            if (!string.IsNullOrEmpty(dto.Status)) complaint.Status = dto.Status;
            if (dto.AdminResponse != null) complaint.AdminResponse = dto.AdminResponse;
            if (adminAttachmentUrls.Any()) 
            {
                // Append new attachments
                var existingUrls = complaint.AdminAttachmentUrls?.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList() ?? new List<string>();
                existingUrls.AddRange(adminAttachmentUrls);
                complaint.AdminAttachmentUrls = string.Join(",", existingUrls); 
            }
            complaint.UpdatedAt = DateTimeHelper.GetIndianTime();

            // Determine log action based on changes
            string action;
            if (oldStatus != complaint.Status)
            {
                // LOG: Status change is the primary action
                action = $"changed status of complaint #{id} to '{complaint.Status}'";
            }
            else if (responseUpdated || adminAttachmentUrls.Any())
            {
                // LOG: Response/Attachment update
                action = $"updated response for complaint #{id}";
            }
            else
            {
                return Ok(new { message = "No changes applied to complaint." }); // No critical change, exit early
            }


            _db.Complaints.Update(complaint);
            await _db.SaveChangesAsync();
            
            // LOG: Admin updated complaint
            await _activityLogger.LogAsync(action, "Complaint", complaint.Title, targetUserName);


            return Ok(new { message = "Complaint updated successfully" });
        }

        // Admin deletes a complaint
        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteComplaint(int id)
        {
            var complaint = await _db.Complaints
                .Include(c => c.AppUser)
                .FirstOrDefaultAsync(c => c.Id == id);
            
            if (complaint == null) return NotFound();

            var targetUserName = complaint.AppUser?.UserName ?? complaint.AppUser?.Email ?? "N/A";
            var complaintTitle = complaint.Title;

            _db.Complaints.Remove(complaint);
            await _db.SaveChangesAsync();

            // LOG: Admin deleted a complaint
            await _activityLogger.LogAsync("deleted complaint", "Complaint", complaintTitle, targetUserName);

            return Ok(new { message = "Complaint deleted successfully" });
        }

        // -------------------- DTOs and Helpers --------------------
        
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