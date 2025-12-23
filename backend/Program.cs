using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using minutechart.Data;
using minutechart.Models;
using minutechart.Helpers;
using minutechart.Services;
using minutechart.Middleware;
using Microsoft.Extensions.FileProviders;
using QuestPDF.Infrastructure;
using System.Net.Sockets;

namespace minutechart
{
    public class Program
    {
        public static async Task Main(string[] args)
        {

            var builder = WebApplication.CreateBuilder(args);

            builder.Services.AddControllersWithViews();

            builder.Services.AddDistributedMemoryCache();
            builder.Services.AddSession(options =>
            {
                options.IdleTimeout = TimeSpan.FromMinutes(30);
                options.Cookie.HttpOnly = true;
                options.Cookie.IsEssential = true;
            });

            builder.Services.ConfigureApplicationCookie(options =>
            {
                options.Cookie.HttpOnly = true;
                options.ExpireTimeSpan = TimeSpan.FromDays(7); // Keep logged in for 7 days
                options.LoginPath = "/account/login";
                options.SlidingExpiration = true;
            });

            builder.Services.AddDbContext<MinutechartDbContext>(options =>
                options.UseSqlServer(
                    builder.Configuration.GetConnectionString("MinutechartDbConnection"),
                    sqlOptions => sqlOptions.CommandTimeout(60)
                ).EnableSensitiveDataLogging()  // Logs key values, but be cautious with sensitive data
                .EnableDetailedErrors()  // For more error details
            );

            builder.Services.Configure<DataProtectionTokenProviderOptions>(options =>
            {
                options.TokenLifespan = TimeSpan.FromMinutes(2);
            });

            builder.Services.AddIdentity<AppUser, IdentityRole>(options =>
            {
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequiredLength = 8;
                options.Password.RequireUppercase = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireDigit = true;
                options.User.RequireUniqueEmail = true;
                options.SignIn.RequireConfirmedAccount = false;
                options.SignIn.RequireConfirmedEmail = false;
                options.SignIn.RequireConfirmedPhoneNumber = false;
            })
            .AddEntityFrameworkStores<MinutechartDbContext>()
            .AddDefaultTokenProviders();

            // local code
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowReactApp", policy =>
                {
                    policy.WithOrigins("http://localhost:3000", "http://192.168.1.116:3000", "http://192.168.1.116:5027")
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials();
                });
            });

            // // render code
            // builder.Services.ConfigureApplicationCookie(options =>
            //  {
            //      options.Cookie.SameSite = SameSiteMode.None;
            //      options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
            //  });
            // builder.Services.AddCors(options =>
            // {
            //     options.AddPolicy("AllowReactApp", policy =>
            //     {
            //         policy.WithOrigins("https://minutechart.vercel.app", "http://192.168.1.116:3000")
            //               .AllowAnyHeader()
            //               .AllowAnyMethod()
            //               .AllowCredentials();
            //     });
            // });


            builder.Services.AddControllers()
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
                });
            builder.Services.AddHttpClient();
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();
            builder.Services.AddAuthorization();
            builder.Services.AddDataProtection();
            builder.Services.AddMemoryCache();

            builder.Services.AddScoped<CommissionService>();
            builder.Services.AddScoped<IClientDbContextFactory, ClientDbContextFactory>();
            builder.Services.AddScoped<DatabaseService>();
            builder.Services.AddScoped<PlanInvoiceService>();
            builder.Services.AddScoped<AddonInvoiceService>();
            builder.Services.AddScoped<UserActivityFilter>();
            builder.Services.AddScoped<SubscriptionService>();
            builder.Services.AddScoped<SubscriptionServiceV2>();
            builder.Services.AddScoped<SubscriptionTimelineManager>();
            builder.Services.AddScoped<DashboardService>();
            builder.Services.AddHostedService<QueuedPlanActivator>();
            builder.Services.AddSingleton<CloudinaryService>();

            builder.Services.AddControllers(options =>
            {
                // Apply the filter to all controllers (or you can apply it per-controller/per-action)
                options.Filters.Add(typeof(UserActivityFilter));
            });
            builder.Services.AddHttpContextAccessor();
            builder.Services.AddScoped<ActivityLogger>();

            builder.Services.AddScoped<IEmailSender, MailKitEmailSender>();
            // builder.Services.AddScoped<IEmailSender, SendGridEmailSender>();
            // builder.Services.AddScoped<IEmailSender, MailjetEmailSender>();


            builder.Services.AddSignalR();
            // builder.Services.AddHttpContextAccessor();

            var app = builder.Build();

            // Ensure required roles exist before creating users
            using (var scope = app.Services.CreateScope())
            {
                var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
                var roles = new[] { "SuperAdmin", "Admin", "User" };

                foreach (var role in roles)
                {
                    if (!await roleManager.RoleExistsAsync(role))
                        await roleManager.CreateAsync(new IdentityRole(role));
                }
            }


            try
            {
                using (var tcpClient = new TcpClient())
                {
                    Console.WriteLine("🔍 Testing connection to SQL Server (43.228.126.198:1433)...");
                    await tcpClient.ConnectAsync("43.228.126.198", 1433);
                    Console.WriteLine("✅ Port 1433 reachable from Render backend");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("❌ Port 1433 unreachable from Render backend: " + ex.Message);
            }

            // Reusable method to create roles and users
            async Task CreateUserIfNotExists(IServiceProvider services, string email, string password, string adminName, string role)
            {
                using var scope = services.CreateScope();
                var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
                var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

                // Ensure the role exists
                if (!await roleManager.RoleExistsAsync(role))
                    await roleManager.CreateAsync(new IdentityRole(role));

                // Check if the user exists
                if (await userManager.FindByEmailAsync(email) != null)
                    return;

                // Create the user
                var user = new AppUser
                {
                    AdminName = adminName,
                    UserName = email,
                    Email = email,
                    EmailConfirmed = true,
                    AccountStatus = "Active",
                    RegistrationDate = DateTimeHelper.GetIndianTime()
                };

                await userManager.CreateAsync(user, password);
                await userManager.AddToRoleAsync(user, role);
            }

            // Now create your users below
            await CreateUserIfNotExists(app.Services, "admin@gmail.com", "Admin@123", "Test Admin", "Admin");
            await CreateUserIfNotExists(app.Services, "abhi@gmail.com", "Admin@123", "Abhi Kathiriya", "Admin");
            await CreateUserIfNotExists(app.Services, "admin2@gmail.com", "Admin@123", "Test Admin 2", "Admin");
            await CreateUserIfNotExists(app.Services, "superadmin@ngraph.com", "Super@123", "NGraph HQ", "SuperAdmin");


            if (app.Environment.IsDevelopment() || app.Environment.IsProduction())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            QuestPDF.Settings.License = LicenseType.Community;
            // app.Use(async (context, next) =>
            // {
            //     Console.WriteLine($"Request Origin: {context.Request.Headers["Origin"]}");
            //     await next();
            // });

            app.UseHttpsRedirection();
            app.UseRouting();
            app.UseCors("AllowReactApp");
            app.UseAuthentication();
            app.UseAuthorization();
            app.UseSession();
            app.UseMiddleware<AccountStatusMiddleware>();
            app.UseMiddleware<SubscriptionMiddleware>();
            app.UseStaticFiles(new StaticFileOptions
            {
                FileProvider = new PhysicalFileProvider(
                Path.Combine(Directory.GetCurrentDirectory(), "wwwroot")),
                RequestPath = ""
            });

            app.MapControllers();

            app.Run();
        }
    }
}
