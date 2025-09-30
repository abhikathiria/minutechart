using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using minutechart.Models;

namespace minutechart.Data
{
    public class MinutechartDbContext : IdentityDbContext<AppUser>
    {
        public MinutechartDbContext(DbContextOptions<MinutechartDbContext> options) : base(options) { }

        public DbSet<AppUser> AppUsers { get; set; }
        public DbSet<UserProfile> UserProfiles { get; set; }
        public DbSet<Supplier> Suppliers { get; set; }
        public DbSet<Agent> Agents { get; set; }
        public DbSet<Broker> Brokers { get; set; }
        public DbSet<Customer> Customers { get; set; }
        public DbSet<ItemGroup> ItemGroups { get; set; }
        public DbSet<Item> Items { get; set; }
        public DbSet<Transaction> Transactions { get; set; }
        public DbSet<TransactionDetail> TransactionDetails { get; set; }
        public DbSet<CashMovement> CashMovements { get; set; }
        public DbSet<Analysis> AnalysisView => Set<Analysis>();
        public DbSet<SchemaMapping> SchemaMappings { get; set; }
        public DbSet<UserQuery> UserQueries { get; set; }
        public DbSet<SubscriptionPlan> SubscriptionPlans { get; set; }
        public DbSet<RazorpayOrder> RazorpayOrders { get; set; }
        public DbSet<Invoice> Invoices { get; set; }
        public DbSet<EmailSetting> EmailSettings { get; set; }
        public DbSet<CompanyInvoiceSetting> CompanyInvoiceSettings { get; set; }
        public DbSet<InvoiceColumnSetting> InvoiceColumnSettings { get; set; }



        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<AppUser>()
                .HasOne(u => u.UserProfile)
                .WithOne(p => p.AppUser)
                .HasForeignKey<UserProfile>(p => p.AppUserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<Item>()
                .HasOne(i => i.ItemGroup)
                .WithMany()
                .HasForeignKey(i => i.ItemGroupID);

            builder.Entity<Transaction>()
                .HasOne(t => t.Customer)
                .WithMany()
                .HasForeignKey(t => t.CustomerID);

            builder.Entity<Transaction>()
                .HasOne(t => t.Supplier)
                .WithMany()
                .HasForeignKey(t => t.SupplierID);

            builder.Entity<Transaction>()
                .HasOne(t => t.Agent)
                .WithMany()
                .HasForeignKey(t => t.AgentID);

            builder.Entity<Transaction>()
                .HasOne(t => t.Broker)
                .WithMany()
                .HasForeignKey(t => t.BrokerID);

            builder.Entity<TransactionDetail>()
                .HasOne(td => td.Transaction)
                .WithMany()
                .HasForeignKey(td => td.TransactionID);

            builder.Entity<TransactionDetail>()
                .HasOne(td => td.Item)
                .WithMany()
                .HasForeignKey(td => td.ItemID);

            builder.Entity<Analysis>()
                .HasNoKey()
                .ToView("AnalysisView");

            builder.Entity<RazorpayOrder>()
                .HasOne(o => o.Plan)
                .WithMany()  // if SubscriptionPlan doesn't track orders, or WithMany(o => o.Orders) if you add a collection
                .HasForeignKey(o => o.PlanId);

            builder.Entity<Invoice>()
                .HasOne(i => i.Plan)
                .WithMany()
                .HasForeignKey(i => i.PlanId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
