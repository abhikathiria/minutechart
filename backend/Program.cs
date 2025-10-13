using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using minutechart.Data;
using minutechart.Models;
using minutechart.Services;
using minutechart.Middleware;
using Microsoft.Extensions.FileProviders;
using QuestPDF.Infrastructure;

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
            // Database setup (this will be updated for multi-tenant later)
            // builder.Services.AddDbContext<DashboardContext>(options =>
            //     options.UseSqlServer(
            //         builder.Configuration.GetConnectionString("DefaultConnection"),
            //         sqlOptions => sqlOptions.CommandTimeout(60)
            //     )
            // );
            // builder.Services.AddDbContext<SecondDbContext>(options =>
            //     options.UseSqlServer(
            //         builder.Configuration.GetConnectionString("SecondDbConnection"),
            //         sqlOptions => sqlOptions.CommandTimeout(60)
            //     )
            // );
            builder.Services.AddDbContext<MinutechartDbContext>(options =>
                options.UseSqlServer(
                    builder.Configuration.GetConnectionString("MinutechartDbConnection"),
                    sqlOptions => sqlOptions.CommandTimeout(60)
                )
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

            builder.Services.ConfigureApplicationCookie(options =>
            {
                options.Cookie.SameSite = SameSiteMode.None;
                options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
            });


            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowReactApp", policy =>
                {
                    policy.WithOrigins("http://192.168.1.104:3000", "https://minutechart.vercel.app", "http://192.168.1.104:5027")
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials();
                });
            });

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

            builder.Services.AddScoped<IClientDbContextFactory, ClientDbContextFactory>();
            builder.Services.AddScoped<DatabaseService>();
            builder.Services.AddScoped<IEmailSender, MailKitEmailSender>();

            builder.Services.AddSignalR();
            builder.Services.AddHttpContextAccessor();

            var app = builder.Build();

            using (var scope = app.Services.CreateScope())
            {
                var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

                var roles = new[] { "Admin", "User" };

                foreach (var role in roles)
                {
                    if (!await roleManager.RoleExistsAsync(role))
                        await roleManager.CreateAsync(new IdentityRole(role));
                }
            }

            using (var scope = app.Services.CreateScope())
            {
                var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();


                string email = "admin@gmail.com";
                string password = "Admin@123";
                if (await userManager.FindByEmailAsync(email) == null)
                {
                    var user = new AppUser();
                    user.AdminName = "Test Admin";
                    // user.CompanyName = "Admin";
                    user.UserName = email;
                    user.Email = email;
                    user.EmailConfirmed = true;
                    user.AccountStatus = "Active";

                    await userManager.CreateAsync(user, password);

                    await userManager.AddToRoleAsync(user, "Admin");
                }
            }

            using (var scope = app.Services.CreateScope())
            {
                var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();


                string email = "abhi@gmail.com";
                string password = "Abhi@123";
                if (await userManager.FindByEmailAsync(email) == null)
                {
                    var user = new AppUser();
                    user.AdminName = "Abhi Kathiriya";
                    // user.CompanyName = "Admin";
                    user.UserName = email;
                    user.Email = email;
                    user.EmailConfirmed = true;
                    user.AccountStatus = "Active";

                    await userManager.CreateAsync(user, password);

                    await userManager.AddToRoleAsync(user, "Admin");
                }
            }

            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            QuestPDF.Settings.License = LicenseType.Community;
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
