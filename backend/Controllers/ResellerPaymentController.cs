using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using minutechart.Data;
using minutechart.DTOs;
using minutechart.Models;
using Microsoft.EntityFrameworkCore;

namespace minutechart.Controllers
{
    [ApiController]
    [Route("api/reseller-payment")]
    public class ResellerPaymentController : ControllerBase
    {
        private readonly MinutechartDbContext _db;
        private readonly UserManager<AppUser> _userManager;

        public ResellerPaymentController(MinutechartDbContext db, UserManager<AppUser> userManager)
        {
            _db = db;
            _userManager = userManager;
        }

        // GET current reseller payment details
        [HttpGet("me")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetMyPaymentDetails()
        {
            var userId = _userManager.GetUserId(User);

            var details = await _db.ResellerPaymentDetails
                .FirstOrDefaultAsync(x => x.AppUserId == userId);

            if (details == null)
            {
                return Ok(new ResellerPaymentDetailsDto());
            }

            return Ok(new ResellerPaymentDetailsDto
            {
                AccountHolderName = details.AccountHolderName,
                BankAccountNumber = details.BankAccountNumber,
                IFSC = details.IFSC,
                UpiId = details.UpiId
            });
        }

        // SAVE / UPDATE payment details
        [HttpPost("save")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Save([FromBody] ResellerPaymentDetailsDto dto)
        {
            var userId = _userManager.GetUserId(User);

            var details = await _db.ResellerPaymentDetails
                .FirstOrDefaultAsync(x => x.AppUserId == userId);

            if (details == null)
            {
                details = new ResellerPaymentDetail
                {
                    AppUserId = userId,
                    AccountHolderName = dto.AccountHolderName,
                    BankAccountNumber = dto.BankAccountNumber,
                    IFSC = dto.IFSC,
                    UpiId = dto.UpiId,
                    UpdatedAt = DateTime.UtcNow
                };

                _db.ResellerPaymentDetails.Add(details);
            }
            else
            {
                details.AccountHolderName = dto.AccountHolderName;
                details.BankAccountNumber = dto.BankAccountNumber;
                details.IFSC = dto.IFSC;
                details.UpiId = dto.UpiId;
                details.UpdatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();

            return Ok(new { message = "Payment details updated" });
        }
    }
}
