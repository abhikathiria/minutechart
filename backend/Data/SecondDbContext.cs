// using Microsoft.EntityFrameworkCore;
// using minutechart.Models;

// namespace minutechart.Data
// {
//     public class SecondDbContext : DbContext
//     {
//         public SecondDbContext(DbContextOptions<SecondDbContext> options) : base(options) { }

//         public DbSet<Abhi> AbhiView => Set<Abhi>();

//         protected override void OnModelCreating(ModelBuilder modelBuilder)
//         {
//             base.OnModelCreating(modelBuilder);

//             modelBuilder.Entity<Abhi>()
//                 .HasNoKey()
//                 .ToView("Abhi");
//         }
//     }
// }