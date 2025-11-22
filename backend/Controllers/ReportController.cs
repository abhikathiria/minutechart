using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System.Threading.Tasks;
using System;
using System.Collections.Generic;
using Microsoft.Extensions.Configuration;
using minutechart.Services;
using minutechart.Helpers;

using PuppeteerSharp;
using PuppeteerSharp.Media;

namespace minutechart.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ReportController : ControllerBase
    {
        private readonly DashboardService _dashboardService;
        private readonly IConfiguration _config;

        public ReportController(DashboardService dashboardService, IConfiguration config)
        {
            _dashboardService = dashboardService;
            _config = config;
        }

        // ============================
        // GET /api/report/data
        // ============================
        [HttpGet("data")]
        public async Task<IActionResult> GetReportData([FromQuery] string userId)
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (currentUserId == null || currentUserId != userId)
                return Forbid("User mismatch.");

            var queries = await _dashboardService.GetUserQueries(currentUserId);
            var modules = new List<object>();

            foreach (var q in queries)
            {
                var result = await _dashboardService.ExecuteQuery(q.UserQueryText, q.UserQueryId);
                if (result.Success)
                {
                    modules.Add(new
                    {
                        q.UserQueryId,
                        q.UserTitle,
                        q.VisualizationType,
                        Data = result.Data
                    });
                }
            }

            return Ok(new
            {
                UserId = currentUserId,
                Filters = new { AdditionalFilters = "None" },
                Modules = modules,
                Timestamp = DateTimeHelper.GetIndianTime().ToString("O")
            });
        }

        // ============================
        // POST /api/report/export
        // ============================
        [HttpPost("export")]
        public async Task<IActionResult> ExportPdf()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null)
                return Unauthorized();

            var token = Guid.NewGuid().ToString("N"); // You can use this in the React page if needed

            // Download Chromium (20+ method)
            var fetcher = new BrowserFetcher();
            await fetcher.DownloadAsync();

            // Launch browser
            await using var browser = await Puppeteer.LaunchAsync(new LaunchOptions
            {
                Headless = true,
                Args = new[]
                {
                    "--no-sandbox",
                    "--disable-setuid-sandbox"
                }
            });

            await using var page = await browser.NewPageAsync();

            var domain = _config["App:BaseUrl"] ?? "http://localhost:3000";

            var renderUrl = $"{domain}/report/render?user={userId}&token={token}";

            try
            {
                // Navigate to React report page
                await page.GoToAsync(renderUrl, WaitUntilNavigation.Networkidle0);

                // Wait for React to signal readiness
                await page.WaitForSelectorAsync("#report-ready-signal", new()
                {
                    Timeout = 60000
                });

                // PDF settings
                var pdfOptions = new PdfOptions
                {
                    Format = PaperFormat.A4,
                    PrintBackground = true,
                    PreferCSSPageSize = true,
                    MarginOptions = new MarginOptions
                    {
                        Top = "1cm",
                        Bottom = "1cm",
                        Left = "1cm",
                        Right = "1cm"
                    }
                };

                // Generate PDF (20+ API)
                var pdfContent = await page.PdfDataAsync(pdfOptions);

                return File(
                    pdfContent,
                    "application/pdf",
                    $"minutechart_{DateTime.Now:yyyyMMdd_HHmmss}.pdf"
                );
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"PDF generation failed: {ex.Message}");
            }
        }
    }
}
