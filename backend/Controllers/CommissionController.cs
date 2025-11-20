using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using minutechart.DTOs;
using minutechart.Models;
using minutechart.Services;
using minutechart.Data;
using Microsoft.EntityFrameworkCore;

namespace minutechart.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CommissionController : ControllerBase
    {
        private readonly CommissionService _commissionService;
        private readonly UserManager<AppUser> _userManager;
        private readonly MinutechartDbContext _db;

        public CommissionController(
            CommissionService commissionService,
            UserManager<AppUser> userManager,
            MinutechartDbContext db)
        {
            _commissionService = commissionService;
            _userManager = userManager;
            _db = db;
        }

        // --------------------------------------------------------------------
        // GET ADMINS LIST
        // Only Super Admin sees this
        // --------------------------------------------------------------------
        [HttpGet("admins")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> GetAdmins()
        {
            var result = new List<object>();

            // We must find ONLY users with Admin role
            var allUsers = await _db.Users.ToListAsync();

            foreach (var user in allUsers)
            {
                var roles = await _userManager.GetRolesAsync(user);
                if (roles.Contains("Admin"))
                {
                    result.Add(new
                    {
                        id = user.Id,
                        name = user.AdminName ?? user.CustomerName ?? user.Email,
                        commissionPercentage = user.CommissionPercentage
                    });
                }
            }

            return Ok(result);
        }

        // --------------------------------------------------------------------
        // PREVIEW COMMISSION FOR AN ADMIN AND DATE RANGE
        // SuperAdmin only
        // --------------------------------------------------------------------
        [HttpGet("calculate")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> CalculateCommission(
            [FromQuery] string adminId,
            [FromQuery] DateTime from,
            [FromQuery] DateTime to)
        {
            try
            {
                var preview = await _commissionService.PreviewCommissionAsync(adminId, from, to);
                return Ok(preview);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Failed to calculate commission", detail = ex.Message });
            }
        }


        public class CreateBillRequestDto
        {
            public string AdminId { get; set; }
            public DateTime FromDate { get; set; }
            public DateTime ToDate { get; set; }

            // optional: if provided, only these purchase IDs will be added to the bill
            public List<int> IncludedPurchaseIds { get; set; }
        }

        [HttpPost("create")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> CreateBill([FromBody] CreateBillRequestDto dto)
        {
            try
            {
                var bill = await _commissionService.CreateBillAsync(dto.AdminId, dto.FromDate, dto.ToDate, dto.IncludedPurchaseIds);

                return Ok(new
                {
                    billId = bill.Id,
                    message = "Commission bill created",
                    total = bill.TotalCommission
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Failed to create bill", detail = ex.Message });
            }
        }


        // --------------------------------------------------------------------
        // LIST ALL COMMISSION BILLS (SuperAdmin)
        // --------------------------------------------------------------------
        [HttpGet("bills")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> GetBills()
        {
            var bills = await _commissionService.ListBillsAsync();
            return Ok(bills);
        }

        // --------------------------------------------------------------------
        // GET BILL DETAILS (SuperAdmin or Admin)
        // --------------------------------------------------------------------
        [HttpGet("bills/{id}")]
        [Authorize(Roles = "SuperAdmin,Admin")]
        public async Task<IActionResult> GetBill(int id)
        {
            var dto = await _commissionService.GetBillAsync(id);

            if (dto == null)
                return NotFound();

            return Ok(dto);
        }


        // --------------------------------------------------------------------
        // APPROVE BILL (SuperAdmin)
        // --------------------------------------------------------------------
        [HttpPut("approve/{billId}")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> Approve(int billId)
        {
            var ok = await _commissionService.ApproveAsync(billId);

            if (!ok)
                return BadRequest(new { message = "Bill not found or not in Pending state" });

            return Ok(new { message = "Bill approved" });
        }

        // --------------------------------------------------------------------
        // ADMIN APPROVES BILL
        // --------------------------------------------------------------------
        [HttpPut("admin-approve/{billId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AdminApprove(int billId)
        {
            var bill = await _db.CommissionBills.FindAsync(billId);
            if (bill == null || bill.Status != "Pending")
                return BadRequest(new { message = "Bill not found or not in Pending state" });

            bill.Status = "ApprovedByAdmin";
            bill.ApprovedAt = DateTime.Now;

            await _db.SaveChangesAsync();

            return Ok(new { message = "Bill approved by admin" });
        }

        // --------------------------------------------------------------------
        // MARK BILL AS PAID (SuperAdmin)
        // --------------------------------------------------------------------
        [HttpPut("pay/{billId}")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> MarkPaid(int billId)
        {
            var bill = await _db.CommissionBills.FindAsync(billId);
            if (bill == null || bill.Status != "ApprovedByAdmin")
                return BadRequest(new { message = "Bill must be approved by admin first" });

            bill.Status = "Paid";
            bill.PaidAt = DateTime.Now;

            await _db.SaveChangesAsync();
            return Ok(new { message = "Bill marked as Paid" });
        }


        // --------------------------------------------------------------------
        // ADMIN VIEW: MY OWN COMMISSION BILLS
        // --------------------------------------------------------------------
        [HttpGet("my-bills")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> MyBills()
        {
            var adminId = _userManager.GetUserId(User);

            // DTO list
            var bills = await _commissionService.GetMyBillsAsync(adminId);

            var billsWithItems = new List<object>();

            foreach (var b in bills)
            {
                // FIXED: use b.BillId (NOT b.Id)
                var details = await _commissionService.GetBillAsync(b.BillId);

                billsWithItems.Add(new
                {
                    billId = b.BillId,
                    adminName = b.AdminName,
                    fromDate = b.FromDate,
                    toDate = b.ToDate,
                    totalCommission = b.TotalCommission,
                    status = b.Status,
                    createdAt = b.CreatedAt,
                    approvedAt = b.ApprovedAt,
                    paidAt = b.PaidAt,

                    items = details?.Items?
                    .Select(it => (object)new
                    {
                        purchaseId = it.PurchaseId,
                        userName = it.CustomerName ?? it.CompanyName,
                        planName = it.PlanName,
                        amount = it.Amount,
                        commissionAmount = it.CommissionAmount,
                        purchasedOn = it.PurchasedOn
                    })
                    .ToList()
                    ?? new List<object>()
                });
            }

            return Ok(billsWithItems);
        }

    }
}
