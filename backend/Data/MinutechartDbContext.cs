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
        public DbSet<AdminProfile> AdminProfiles { get; set; }
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
        public DbSet<Complaint> Complaints { get; set; }
        public DbSet<ActiveSession> ActiveSessions { get; set; }
        public DbSet<ActivityLog> ActivityLogs { get; set; }
        public DbSet<ModuleSuggestion> ModuleSuggestions { get; set; }
        public DbSet<CommissionBill> CommissionBills { get; set; }
        public DbSet<CommissionBillItem> CommissionBillItems { get; set; }
        public DbSet<ResellerPaymentDetail> ResellerPaymentDetails { get; set; }
        public DbSet<Pricing> Pricings { get; set; }
        public DbSet<PlannedSubscriptionChange> PlannedSubscriptionChanges { get; set; }
        public DbSet<RazorpayPlanOrder> RazorpayPlanOrders { get; set; }
        public DbSet<PlanInvoice> PlanInvoices { get; set; }
        public DbSet<UserAddon> UserAddons { get; set; }
        public DbSet<AddonInvoice> AddonInvoices { get; set; }
        public DbSet<RazorpayAddonOrder> RazorpayAddonOrders { get; set; }
        public DbSet<SalesModule> SalesModules { get; set; }
        public DbSet<ProductionModule> ProductionModules { get; set; }
        public DbSet<ExpenseModule> ExpenseModules { get; set; }
        public DbSet<FinanceModule> FinanceModules { get; set; }
        public DbSet<CatalogProduct> CatalogProducts { get; set; }
        public DbSet<ProcurementsMain> ProcurementsMains { get; set; }
        public DbSet<ProcurementsRequirement> ProcurementsRequirements { get; set; }
        public DbSet<ProcurementsQuote> ProcurementsQuotes { get; set; }
        public DbSet<ProcurementsPurchaseOrder> ProcurementsPurchaseOrders { get; set; }
        public DbSet<ProcurementsPurchaseReturn> ProcurementsPurchaseReturns { get; set; }
        public DbSet<ProcurementsReport> ProcurementsReports { get; set; }
        

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<AppUser>()
                .HasOne(u => u.AssignedAdmin)
                .WithMany()
                .HasForeignKey(u => u.AssignedAdminId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<AppUser>()
                .HasOne(u => u.UserProfile)
                .WithOne(p => p.AppUser)
                .HasForeignKey<UserProfile>(p => p.AppUserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Complaint>()
                .HasOne(c => c.AppUser)
                .WithMany()
                .HasForeignKey(c => c.AppUserId)
                .OnDelete(DeleteBehavior.Restrict);

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
                .WithMany()
                .HasForeignKey(o => o.PlanId);

            builder.Entity<Invoice>()
                .HasOne(i => i.Plan)
                .WithMany()
                .HasForeignKey(i => i.PlanId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<SalesModule>()
                .HasIndex(x => new { x.AppUserId, x.ComponentId })
                .IsUnique();

            builder.Entity<ProductionModule>()
                .HasIndex(x => new { x.AppUserId, x.ComponentId })
                .IsUnique();

            builder.Entity<ExpenseModule>()
                .HasIndex(x => new { x.AppUserId, x.ComponentId })
                .IsUnique();

            builder.Entity<FinanceModule>()
                .HasIndex(x => new { x.AppUserId, x.ComponentId })
                .IsUnique();

        }
    }
}
