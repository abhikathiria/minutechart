using Microsoft.EntityFrameworkCore;
using minutechart.Models;
using minutechart.DTOs;

namespace minutechart.Services
{
    public class ClientDbContext : DbContext
    {
        public ClientDbContext(DbContextOptions<ClientDbContext> options)
            : base(options)
        {
        }

        // ===== HR-related =====
        public DbSet<EmployeeData> EmployeeDataView { get; set; }

        // ===== Product/Inventory-related =====
        public DbSet<Abhi> AbhiView => Set<Abhi>();
        public DbSet<Analysis> AnalysisView => Set<Analysis>();
        public DbSet<TopCustomerDto> TopCustomerResults { get; set; }
        public DbSet<TopAgentDto> TopAgentResults { get; set; }
        public DbSet<TopBrokerDto> TopBrokerResults { get; set; }
        public DbSet<TopSupplierDto> TopSupplierResults { get; set; }
        public DbSet<TopItemDto> TopItemResults { get; set; }
        public DbSet<TopItemGroupDto> TopItemGroupResults { get; set; }
        public DbSet<TopResultDto> TopResult { get; set; }





        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<EmployeeData>()
                .HasNoKey()
                .ToView("EmployeeData");

            modelBuilder.Entity<Abhi>()
                .HasNoKey()
                .ToView("Abhi");

            modelBuilder.Entity<Analysis>()
                .HasNoKey()
                .ToView("AnalysisView");

            modelBuilder.Entity<TopCustomerDto>()
                .HasNoKey();

            modelBuilder.Entity<TopAgentDto>()
                .HasNoKey();

            modelBuilder.Entity<TopBrokerDto>()
                .HasNoKey();

            modelBuilder.Entity<TopSupplierDto>()
                .HasNoKey();

            modelBuilder.Entity<TopItemDto>()
                .HasNoKey();

            modelBuilder.Entity<TopItemGroupDto>()
                .HasNoKey();
            
            modelBuilder.Entity<TopResultDto>()
                .HasNoKey();

        }
    }
}
