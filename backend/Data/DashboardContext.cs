// using Microsoft.EntityFrameworkCore;
// using minutechart.Models;

// namespace minutechart.Data
// {
//     public class DashboardContext : DbContext
//     {
//         public DashboardContext(DbContextOptions<DashboardContext> options) : base(options) { }

//         public DbSet<Product> Products => Set<Product>();
//         public DbSet<Category> Categories => Set<Category>();
//         public DbSet<SubCategory> SubCategories => Set<SubCategory>();
//         public DbSet<PackDetail> PackDetails => Set<PackDetail>();
//         public DbSet<Customer> Customers => Set<Customer>();
//         public DbSet<Address> Addresses => Set<Address>();
//         public DbSet<Cart> Carts => Set<Cart>();
//         public DbSet<Order> Orders => Set<Order>();
//         public DbSet<DraftOrder> DraftOrders => Set<DraftOrder>();
//         public DbSet<OrderDetail> OrderDetails => Set<OrderDetail>();
//         public DbSet<DraftOrderDetail> DraftOrderDetails => Set<DraftOrderDetail>();
//         public DbSet<Coupon> Coupons => Set<Coupon>();
//         public DbSet<Wishlist> Wishlists => Set<Wishlist>();
//         public DbSet<Role> Roles => Set<Role>();
//         public DbSet<Department> Departments => Set<Department>();
//         public DbSet<Unit> Units => Set<Unit>();
//         public DbSet<Employee> Employees => Set<Employee>();
//         public DbSet<ProductionBatch> ProductionBatches => Set<ProductionBatch>();
//         public DbSet<StockDetail> StockDetails => Set<StockDetail>();
//         public DbSet<Inventory> Inventory => Set<Inventory>();
//         public DbSet<ManufacturingRequest> ManufacturingRequests => Set<ManufacturingRequest>();
//         public DbSet<EmployeeData> EmployeeDataView => Set<EmployeeData>();


//         public override int SaveChanges()
//         {
//             DisableTriggers();
//             ProcessCustomerData();
//             ProcessRoleData();
//             ProcessDepartmentData();
//             ProcessUnitData();
//             ProcessEmployeeData();
//             // ProcessSupervisorData();
//             var result = base.SaveChanges();
//             EnableTriggers();
//             return result;
//         }

//         public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
//         {
//             DisableTriggers();
//             ProcessCustomerData();
//             ProcessRoleData();
//             ProcessDepartmentData();
//             ProcessUnitData();
//             ProcessEmployeeData();
//             // ProcessSupervisorData();
//             var result = await base.SaveChangesAsync(cancellationToken);
//             EnableTriggers();
//             return result;
//         }

//         private void ProcessCustomerData()
//         {
//             foreach (var entry in ChangeTracker.Entries<Customer>())
//             {
//                 if (entry.State == EntityState.Added || entry.State == EntityState.Modified)
//                 {
//                     // Ensure CustomerType is always stored in uppercase
//                     entry.Entity.CustomerType = entry.Entity.CustomerType.ToUpper();

//                     // Generate CustomerCode for new customers
//                     if (entry.State == EntityState.Added)
//                     {
//                         entry.Entity.GenerateCustomerCode();
//                     }
//                 }
//             }
//         }

//         private void ProcessRoleData()
//         {
//             foreach (var entry in ChangeTracker.Entries<Role>())
//             {
//                 if (entry.State == EntityState.Added || entry.State == EntityState.Modified)
//                 {
//                     // Generate RoleCode for new roles
//                     if (entry.State == EntityState.Added)
//                     {
//                         entry.Entity.GenerateRoleCode();
//                     }
//                 }
//             }
//         }

//         private void ProcessDepartmentData()
//         {
//             foreach (var entry in ChangeTracker.Entries<Department>())
//             {
//                 if (entry.State == EntityState.Added || entry.State == EntityState.Modified)
//                 {
//                     // Generate DepartmentCode for new departments
//                     if (entry.State == EntityState.Added)
//                     {
//                         entry.Entity.GenerateDepartmentCode();
//                     }
//                 }
//             }
//         }

//         private void ProcessUnitData()
//         {
//             foreach (var entry in ChangeTracker.Entries<Unit>())
//             {
//                 if (entry.State == EntityState.Added || entry.State == EntityState.Modified)
//                 {
//                     // Generate UnitCode for new units
//                     if (entry.State == EntityState.Added)
//                     {
//                         entry.Entity.GenerateUnitCode();
//                     }
//                 }
//             }
//         }

//         private void ProcessEmployeeData()
//         {
//             foreach (var entry in ChangeTracker.Entries<Employee>())
//             {
//                 if (entry.State == EntityState.Added || entry.State == EntityState.Modified)
//                 {
//                     // Generate EmployeeCode for new units
//                     if (entry.State == EntityState.Added)
//                     {
//                         entry.Entity.GenerateEmployeeCode();
//                     }
//                 }
//             }
//         }
//         private void DisableTriggers()
//         {
//             try
//             {
//                 if (Database.GetDbConnection().State == System.Data.ConnectionState.Closed)
//                     Database.OpenConnection();

//                 Database.ExecuteSqlRaw("IF OBJECT_ID('dbo.Carts') IS NOT NULL DISABLE TRIGGER ALL ON dbo.Carts;");
//                 Database.ExecuteSqlRaw("IF OBJECT_ID('dbo.Orders') IS NOT NULL DISABLE TRIGGER ALL ON dbo.Orders;");
//             }
//             catch { /* swallow to avoid breaking unrelated saves (e.g., Users) */ }
//         }

//         private void EnableTriggers()
//         {
//             try
//             {
//                 Database.ExecuteSqlRaw("IF OBJECT_ID('dbo.Carts') IS NOT NULL ENABLE TRIGGER ALL ON dbo.Carts;");
//                 Database.ExecuteSqlRaw("IF OBJECT_ID('dbo.Orders') IS NOT NULL ENABLE TRIGGER ALL ON dbo.Orders;");
//             }
//             catch { /* swallow */ }
//         }


//         protected override void OnModelCreating(ModelBuilder modelBuilder)
//         {
//             // Apply Identity configurations first
//             base.OnModelCreating(modelBuilder);

//             // Category → SubCategory Relationship
//             modelBuilder.Entity<Category>()
//                 .HasMany(c => c.SubCategories)
//                 .WithOne(sc => sc.Category)
//                 .HasForeignKey(sc => sc.CategoryID);

//             // SubCategory → Product Relationship
//             modelBuilder.Entity<SubCategory>()
//                 .HasMany(sc => sc.Products)
//                 .WithOne(p => p.SubCategory)
//                 .HasForeignKey(p => p.SubCategoryID);

//             // Ensure ProductSKU is unique
//             modelBuilder.Entity<Product>()
//                 .HasIndex(p => p.ProductSKU)
//                 .IsUnique();

//             // PackDetail → Product Relationship via ProductSKU
//             modelBuilder.Entity<PackDetail>()
//                 .HasOne(pd => pd.Product)
//                 .WithMany(p => p.PackDetails)
//                 .HasForeignKey(pd => pd.ProductSKU)
//                 .HasPrincipalKey(p => p.ProductSKU);

//             modelBuilder.Entity<PackDetail>()
//                 .HasIndex(pd => pd.PackSKU)
//                 .IsUnique();

//             modelBuilder.Entity<Cart>()
//                 .HasOne(c => c.Customer)
//                 .WithMany(c => c.Carts)
//                 .HasForeignKey(c => c.CustomerID)
//                 .OnDelete(DeleteBehavior.Cascade);

//             modelBuilder.Entity<Cart>()
//                 .HasOne(c => c.PackDetail)
//                 .WithMany(c => c.Carts)
//                 .HasForeignKey(c => c.PackSKU)
//                 .HasPrincipalKey(c => c.PackSKU)
//                 .OnDelete(DeleteBehavior.Cascade);

//             modelBuilder.Entity<Wishlist>()
//                 .HasOne(w => w.Customer)
//                 .WithMany(c => c.Wishlists) // Make sure Customer has `public ICollection<Wishlist> Wishlists => Set<Employee>();`
//                 .HasForeignKey(w => w.CustomerID)
//                 .OnDelete(DeleteBehavior.Cascade);

//             modelBuilder.Entity<Wishlist>()
//                 .HasOne(w => w.PackDetail)
//                 .WithMany(p => p.Wishlists) // Make sure PackDetail has `public ICollection<Wishlist> Wishlists => Set<Employee>();`
//                 .HasForeignKey(w => w.PackSKU)
//                 .HasPrincipalKey(p => p.PackSKU)
//                 .OnDelete(DeleteBehavior.Cascade);


//             modelBuilder.Entity<Cart>()
//                 .HasOne(c => c.Coupon)
//                 .WithMany(c => c.Carts)
//                 .HasForeignKey(c => c.CouponCode)
//                 .HasPrincipalKey(c => c.CouponCode)
//                 .OnDelete(DeleteBehavior.Cascade);

//             modelBuilder.Entity<Order>()
//                 .HasOne(o => o.Customer)
//                 .WithMany(c => c.Orders)
//                 .HasForeignKey(o => o.CustomerID)
//                 .OnDelete(DeleteBehavior.Restrict);

//             modelBuilder.Entity<Order>()
//                 .HasOne(o => o.Coupon)
//                 .WithMany(c => c.Orders)
//                 .HasForeignKey(o => o.CouponCode)
//                 .HasPrincipalKey(c => c.CouponCode)
//                 .OnDelete(DeleteBehavior.Cascade);

//             // Order-OrderDetail Relationship
//             modelBuilder.Entity<OrderDetail>()
//                 .HasOne(od => od.Order)
//                 .WithMany(o => o.OrderDetails)
//                 .HasForeignKey(od => od.OrderID)
//                 .OnDelete(DeleteBehavior.Cascade);

//             modelBuilder.Entity<DraftOrder>()
//                 .HasOne(o => o.Coupon)
//                 .WithMany(c => c.DraftOrders)
//                 .HasForeignKey(o => o.CouponCode)
//                 .HasPrincipalKey(c => c.CouponCode)
//                 .OnDelete(DeleteBehavior.Cascade);

//             modelBuilder.Entity<DraftOrderDetail>()
//                 .HasOne(od => od.DraftOrder)
//                 .WithMany(o => o.DraftOrderDetails)
//                 .HasForeignKey(od => od.DraftOrderID)
//                 .OnDelete(DeleteBehavior.Cascade);

//             // Computed Column for Total Price
//             modelBuilder.Entity<DraftOrderDetail>()
//                 .Property(od => od.TotalPrice)
//                 .HasComputedColumnSql("[Quantity] * ([PackPrice] - ([PackPrice] * [DiscountPercentage] / 100)) PERSISTED");

//             // PackDetail-DraftOrderDetail Relationship
//             modelBuilder.Entity<DraftOrderDetail>()
//                 .HasOne(dod => dod.PackDetail)
//                 .WithMany(pd => pd.DraftOrderDetails)
//                 .HasForeignKey(dod => dod.PackSKU)
//                 .HasPrincipalKey(p => p.PackSKU)
//                 .OnDelete(DeleteBehavior.Cascade);

//             // PackDetail-OrderDetail Relationship
//             modelBuilder.Entity<OrderDetail>()
//                 .HasOne(od => od.PackDetail)
//                 .WithMany(pd => pd.OrderDetails)
//                 .HasForeignKey(od => od.PackSKU)
//                 .HasPrincipalKey(p => p.PackSKU)
//                 .OnDelete(DeleteBehavior.Cascade);

//             // Computed Column for Total Price
//             modelBuilder.Entity<OrderDetail>()
//                 .Property(od => od.TotalPrice)
//                 .HasComputedColumnSql("[Quantity] * ([PackPrice] - ([PackPrice] * [DiscountPercentage] / 100)) PERSISTED");

//             modelBuilder.Entity<Coupon>()
//             .HasIndex(c => c.CouponCode)
//             .IsUnique(); // Ensures unique coupon codes

//             // Customer → Address (One-to-Many)
//             modelBuilder.Entity<Customer>()
//                 .HasMany(c => c.Addresses)
//                 .WithOne(a => a.Customer)
//                 .HasForeignKey(a => a.CustomerID)  // Changed from CustomerCode to CustomerID
//                 .HasPrincipalKey(c => c.CustomerID)
//                 .OnDelete(DeleteBehavior.Cascade);

//             // Ensure CustomerID in Address table cannot be null
//             modelBuilder.Entity<Address>()
//                 .Property(a => a.CustomerID)  // Changed from CustomerCode to CustomerID
//                 .IsRequired();


//             // Ensure RoleCode is unique
//             modelBuilder.Entity<Role>()
//                 .HasIndex(r => r.RoleCode)
//                 .IsUnique();

//             // Department → Unit (One-to-Many)
//             modelBuilder.Entity<Unit>()
//                 .HasOne(u => u.Department)
//                 .WithMany()
//                 .HasForeignKey(u => u.DepartmentID)
//                 .OnDelete(DeleteBehavior.Cascade);

//             // // Employee → Role Relationship via RoleCode
//             modelBuilder.Entity<Employee>()
//                 .HasOne(e => e.Role)
//                 .WithMany(r => r.Employees)
//                 .HasForeignKey(e => e.RoleCode)
//                 .HasPrincipalKey(r => r.RoleCode)
//                 .OnDelete(DeleteBehavior.Restrict);

//             modelBuilder.Entity<Employee>()
//                 .HasOne(e => e.Department)
//                 .WithMany()
//                 .HasForeignKey(e => e.DepartmentID)
//                 .OnDelete(DeleteBehavior.Restrict);

//             modelBuilder.Entity<Employee>()
//                 .HasOne(e => e.Unit)
//                 .WithMany()
//                 .HasForeignKey(e => e.UnitID)
//                 .OnDelete(DeleteBehavior.Restrict);

//             // Set default value for CreatedAt
//             modelBuilder.Entity<ProductionBatch>()
//                 .Property(b => b.CreatedAt)
//                 .HasDefaultValueSql("GETDATE()");

//             // Optional: prevent deletion of PackDetail if ProductionBatch exists
//             modelBuilder.Entity<ProductionBatch>()
//                 .HasOne(b => b.PackDetail)
//                 .WithMany(p => p.ProductionBatches)
//                 .HasForeignKey(b => b.PackSKU)
//                 .HasPrincipalKey(p => p.PackSKU)
//                 .OnDelete(DeleteBehavior.Cascade);

//             // Set default value for Status to 'IN STOCK'
//             modelBuilder.Entity<StockDetail>()
//                 .Property(s => s.Status)
//                 .HasDefaultValue("IN STOCK");

//             // Enforce enum-like values for Status (you already enforce it at SQL level and via validation above)
//             modelBuilder.Entity<StockDetail>()
//                 .Property(s => s.Status)
//                 .HasConversion<string>();

//             // Relationships
//             modelBuilder.Entity<StockDetail>()
//                 .HasOne(s => s.PackDetail)
//                 .WithMany(p => p.StockDetails)
//                 .HasForeignKey(s => s.PackSKU)
//                 .HasPrincipalKey(p => p.PackSKU)
//                 .OnDelete(DeleteBehavior.Restrict);

//             modelBuilder.Entity<StockDetail>()
//                 .HasOne(s => s.ProductionBatch)
//                 .WithMany(b => b.StockDetails)
//                 .HasForeignKey(s => s.BatchID)
//                 .OnDelete(DeleteBehavior.Restrict);
//             // Inventory
//             modelBuilder.Entity<Inventory>()
//                 .Property(i => i.IsDiscontinued)
//                 .HasDefaultValue(false);

//             modelBuilder.Entity<Inventory>()
//                 .Property(i => i.LastRestocked)
//                 .HasDefaultValueSql("GETDATE()");

//             modelBuilder.Entity<Inventory>()
//                 .HasCheckConstraint("CK_Inventory_StockQuantity", "[StockQuantity] >= 0");

//             modelBuilder.Entity<Inventory>()
//                 .HasOne(i => i.PackDetails)
//                 .WithMany(i => i.Inventory)
//                 .HasForeignKey(i => i.PackSKU)
//                 .HasPrincipalKey(i => i.PackSKU)
//                 .OnDelete(DeleteBehavior.Restrict);

//             modelBuilder.Entity<ManufacturingRequest>()
//                .HasOne(mr => mr.PackDetails)
//                .WithMany(mr => mr.ManufacturingRequests)
//                .HasForeignKey(mr => mr.PackSKU)
//                .HasPrincipalKey(mr => mr.PackSKU)
//                .OnDelete(DeleteBehavior.Restrict);

//             modelBuilder.Entity<EmployeeData>()
//                 .HasNoKey()
//                 .ToView("EmployeeData");

//             // modelBuilder.Entity<Client>()
//             //     .HasIndex(u => u.Email)
//             //     .IsUnique();

//             // modelBuilder.Entity<UserDatabaseConfig>()
//             //     .HasOne(x => x.Client)
//             //     .WithOne(u => u.DatabaseConfig)
//             //     .HasForeignKey<UserDatabaseConfig>(x => x.ClientId)
//             //     .OnDelete(DeleteBehavior.Cascade);
//         }
//     }
// }