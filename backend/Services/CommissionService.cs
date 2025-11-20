using minutechart.Data;
using minutechart.Helpers;
using minutechart.Models;
using Microsoft.EntityFrameworkCore;
using Stripe.Events;

namespace minutechart.Services
{
    public class CommissionService
    {
        private readonly MinutechartDbContext _db;

        public CommissionService(MinutechartDbContext db)
        {
            _db = db;
        }

        public class CommissionPreviewItemDto
        {
            public int PurchaseId { get; set; }
            public string UserId { get; set; }
            public string UserName { get; set; }
            public string PlanName { get; set; }
            public decimal Amount { get; set; }
            public decimal CommissionPercentage { get; set; }
            public decimal CommissionAmount { get; set; }
            public DateTime PurchasedOn { get; set; }
        }

        public class CommissionPreviewDto
        {
            public string AdminId { get; set; }
            public string AdminName { get; set; }
            public decimal CommissionPercentage { get; set; }
            public DateTime FromDate { get; set; }
            public DateTime ToDate { get; set; }
            public decimal TotalCommission { get; set; }
            public List<CommissionPreviewItemDto> Items { get; set; }
        }

        public class CreateBillRequestDto
        {
            public string AdminId { get; set; }
            public DateTime FromDate { get; set; }
            public DateTime ToDate { get; set; }
        }

        public class CommissionBillDto
        {
            public int BillId { get; set; }
            public string AdminId { get; set; }
            public string AdminName { get; set; }
            public DateTime FromDate { get; set; }
            public DateTime ToDate { get; set; }
            public decimal TotalCommission { get; set; }
            public string Status { get; set; }
            public DateTime CreatedAt { get; set; }
            public DateTime? ApprovedAt { get; set; }
            public DateTime? PaidAt { get; set; }
            public List<CommissionBillItemDto> Items { get; set; }
        }

        public class CommissionBillItemDto
        {
            public int PurchaseId { get; set; }
            public string CompanyName { get; set; }
            public string CustomerName { get; set; }
            public string PlanName { get; set; }
            public decimal Amount { get; set; }
            public decimal CommissionAmount { get; set; }
            public DateTime PurchasedOn { get; set; }
        }



        //
        // 1. PREVIEW COMMISSION (NO DB WRITE)
        //
        public async Task<CommissionPreviewDto> PreviewCommissionAsync(string adminId, DateTime from, DateTime to)
        {
            var admin = await _db.Users.FirstOrDefaultAsync(u => u.Id == adminId);

            if (admin == null)
                throw new Exception("Admin not found");

            var commissionPercent = admin.CommissionPercentage ?? 0m;

            // --- SQL 2012 COMPATIBILITY FIX ---
            // 1. Perform a single database query to get all orders AND the related user details.
            // This uses an explicit Join that avoids the incompatible OPENJSON translation.

            // We project directly into an anonymous object containing both the Order and the User.
            var results = await _db.RazorpayOrders
                .Include(o => o.Plan)
                // Explicitly join RazorpayOrders with Users where the User's AssignedAdminId matches the current adminId
                .Join(_db.Users,
                    order => order.AppUserId,
                    user => user.Id,
                    (order, user) => new { order, user })
                .Where(r =>
                    r.user.AssignedAdminId == adminId && // Filter by admin's customers
                    r.order.Status == "paid" &&
                    r.order.PaidAt >= from &&
                    r.order.PaidAt <= to
                )
                .ToListAsync();

            // The list of 'users' is no longer needed to be fetched separately.
            // var users = await _db.Users ... (REMOVED)

            var items = new List<CommissionPreviewItemDto>();
            decimal total = 0;

            foreach (var result in results)
            {
                // Access order and user from the joined result
                var order = result.order;
                var user = result.user;

                // order.Amount is non-nullable decimal
                decimal orderAmount = order.Amount;

                var percent = commissionPercent;
                var commissionAmt = Math.Round(orderAmount * percent / 100m, 2);

                items.Add(new CommissionPreviewItemDto
                {
                    PurchaseId = order.Id,
                    UserId = user.Id,
                    UserName = user.CustomerName ?? user.CompanyName ?? user.Email,
                    PlanName = order.Plan?.Name ?? "Unknown",
                    Amount = orderAmount,
                    CommissionPercentage = percent,
                    CommissionAmount = commissionAmt,
                    PurchasedOn = order.PaidAt ?? order.CreatedAt
                });

                total += commissionAmt;
            }
            // --- END FIX ---

            return new CommissionPreviewDto
            {
                AdminId = adminId,
                AdminName = admin.AdminName ?? admin.CustomerName ?? admin.Email,
                CommissionPercentage = commissionPercent,
                FromDate = from,
                ToDate = to,
                TotalCommission = total,
                Items = items
            };
        }

        //
        // 2. CREATE BILL (WRITES TO DB)
        //
        // updated method: accepts optional includedPurchaseIds
        public async Task<CommissionBill> CreateBillAsync(string adminId, DateTime from, DateTime to, List<int>? includedPurchaseIds = null)
        {
            // compute preview
            var preview = await PreviewCommissionAsync(adminId, from, to);

            // if includedPurchaseIds provided -> filter preview items & recompute total
            List<CommissionPreviewItemDto> itemsToWrite;
            if (includedPurchaseIds != null && includedPurchaseIds.Any())
            {
                itemsToWrite = preview.Items
                    .Where(i => includedPurchaseIds.Contains(i.PurchaseId))
                    .ToList();

                // recompute total based on selected items
                preview.TotalCommission = itemsToWrite.Sum(i => i.CommissionAmount);
            }
            else
            {
                itemsToWrite = preview.Items;
            }

            var admin = await _db.Users.FirstAsync(u => u.Id == adminId);

            var bill = new CommissionBill
            {
                AppUserId = adminId,
                AdminName = admin.AdminName ?? admin.Email,
                FromDate = from,
                ToDate = to,
                TotalCommission = preview.TotalCommission,
                Status = "Pending"
            };

            _db.CommissionBills.Add(bill);
            await _db.SaveChangesAsync();

            // fetch all admin users once to avoid DB calls in loop
            var allAdminUsers = await _db.Users
                .Where(u => u.AssignedAdminId == adminId)
                .ToListAsync();

            var usersDict = allAdminUsers.ToDictionary(u => u.Id);

            foreach (var line in itemsToWrite)
            {
                if (!usersDict.TryGetValue(line.UserId, out var user) || user == null)
                {
                    // skip if missing
                    continue;
                }

                _db.CommissionBillItems.Add(new CommissionBillItem
                {
                    CommissionBillId = bill.Id,
                    AppUserId = line.UserId,
                    CompanyName = user.CompanyName,
                    CustomerName = user.CustomerName,

                    PurchaseId = line.PurchaseId,
                    PlanName = line.PlanName,
                    Amount = line.Amount,

                    CommissionPercentage = line.CommissionPercentage,
                    CommissionAmount = line.CommissionAmount,
                    PurchasedOn = line.PurchasedOn
                });
            }

            await _db.SaveChangesAsync();
            return bill;
        }

        //
        // 3. ADMIN LIST
        //
        public async Task<List<object>> GetAdminListAsync()
        {
            var admins = await _db.Users.ToListAsync();

            var list = new List<object>();
            foreach (var user in admins)
            {
                // filter by role later in controller
                list.Add(new
                {
                    id = user.Id,
                    name = user.AdminName ?? user.CustomerName ?? user.Email,
                    commissionPercentage = user.CommissionPercentage
                });
            }

            return list;
        }

        //
        // 4. BILL LIST (SUPERADMIN)
        //
        public async Task<List<CommissionBillDto>> ListBillsAsync()
        {
            var bills = await _db.CommissionBills
                .Include(b => b.Admin)
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync();

            return bills.Select(b => new CommissionBillDto
            {
                BillId = b.Id,
                AdminId = b.AppUserId,
                AdminName = b.AdminName,
                FromDate = b.FromDate,
                ToDate = b.ToDate,
                TotalCommission = b.TotalCommission,
                Status = b.Status,
                CreatedAt = b.CreatedAt,
                ApprovedAt = b.ApprovedAt,
                PaidAt = b.PaidAt
            }).ToList();
        }

        //
        // 5. BILL DETAILS
        //
        public async Task<CommissionBillDto> GetBillAsync(int billId)
        {
            var bill = await _db.CommissionBills
                .Include(b => b.Items)
                .Include(b => b.Admin)
                .FirstOrDefaultAsync(b => b.Id == billId);

            if (bill == null)
                return null;

            return new CommissionBillDto
            {
                BillId = bill.Id,
                AdminId = bill.AppUserId,
                AdminName = bill.AdminName,
                FromDate = bill.FromDate,
                ToDate = bill.ToDate,
                TotalCommission = bill.TotalCommission,
                Status = bill.Status,
                CreatedAt = bill.CreatedAt,
                ApprovedAt = bill.ApprovedAt,
                PaidAt = bill.PaidAt,

                Items = bill.Items?.Select(it => new CommissionBillItemDto
                {
                    PurchaseId = it.PurchaseId,
                    CompanyName = it.CompanyName,
                    CustomerName = it.CustomerName,
                    PlanName = it.PlanName,
                    Amount = it.Amount,
                    CommissionAmount = it.CommissionAmount,
                    PurchasedOn = it.PurchasedOn
                }).ToList()
            };
        }


        //
        // 6. APPROVE BILL
        //
        public async Task<bool> ApproveAsync(int billId)
        {
            var bill = await _db.CommissionBills.FindAsync(billId);
            if (bill == null || bill.Status != "Pending") return false;

            bill.Status = "Approved";
            bill.ApprovedAt = DateTimeHelper.GetIndianTime();

            await _db.SaveChangesAsync();
            return true;
        }

        //
        // 7. MARK PAID
        //
        public async Task<bool> MarkPaidAsync(int billId)
        {
            var bill = await _db.CommissionBills.FindAsync(billId);
            if (bill == null || bill.Status != "Approved") return false;

            bill.Status = "Paid";
            bill.PaidAt = DateTimeHelper.GetIndianTime();

            await _db.SaveChangesAsync();
            return true;
        }

        //
        // 8. ADMIN VIEW - MY BILLS
        //
        public async Task<List<CommissionBillDto>> GetMyBillsAsync(string adminId)
        {
            var bills = await _db.CommissionBills
                .Where(b => b.AppUserId == adminId)
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync();

            return bills.Select(b => new CommissionBillDto
            {
                BillId = b.Id,
                AdminId = adminId,
                AdminName = b.AdminName,
                FromDate = b.FromDate,
                ToDate = b.ToDate,
                TotalCommission = b.TotalCommission,
                Status = b.Status,
                CreatedAt = b.CreatedAt,
                ApprovedAt = b.ApprovedAt,
                PaidAt = b.PaidAt
            }).ToList();
        }
    }
}