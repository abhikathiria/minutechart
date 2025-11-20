using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using minutechart.Data;
using minutechart.Models;

namespace minutechart.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PricingController : ControllerBase
    {
        private readonly MinutechartDbContext _db;

        public PricingController(MinutechartDbContext db)
        {
            _db = db;
        }

        // -------------------------
        // Get All
        // -------------------------
        [HttpGet]
        public async Task<IActionResult> GetAllPricings()
        {
            var result = await _db.Pricings.ToListAsync();
            return Ok(result);
        }

        // -------------------------
        // Get One
        // -------------------------
        [HttpGet("{id}")]
        public async Task<IActionResult> GetIndividualPricing(int id)
        {
            var result = await _db.Pricings.FindAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        // -------------------------
        // Create New Pricing
        // -------------------------
        [HttpPost]
        public async Task<IActionResult> CreatePricing([FromBody] Pricing model)
        {
            if (model == null)
                return BadRequest("Invalid pricing data");

            _db.Pricings.Add(model);
            await _db.SaveChangesAsync();

            return Ok(model);
        }

        // -------------------------
        // Update Existing Pricing
        // -------------------------
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePricing(int id, [FromBody] Pricing updated)
        {
            var plan = await _db.Pricings.FindAsync(id);
            if (plan == null) return NotFound();

            plan.Name = updated.Name;
            plan.MonthlyPrice = updated.MonthlyPrice;
            plan.AnnualPrice = updated.AnnualPrice;
            plan.DashboardLimit = updated.DashboardLimit;
            plan.RefreshRateMinutes = updated.RefreshRateMinutes;
            plan.ExcelExport = updated.ExcelExport;
            plan.PrioritySupport = updated.PrioritySupport;
            plan.DashboardAddonEnabled = updated.DashboardAddonEnabled;
            plan.AddonPrice = updated.AddonPrice;
            plan.AddonDashboards = updated.AddonDashboards;

            await _db.SaveChangesAsync();
            return Ok(plan);
        }

        // -------------------------
        // Delete Pricing
        // -------------------------
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePricing(int id)
        {
            var plan = await _db.Pricings.FindAsync(id);
            if (plan == null) return NotFound();

            _db.Pricings.Remove(plan);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Pricing deleted successfully" });
        }
    }
}
