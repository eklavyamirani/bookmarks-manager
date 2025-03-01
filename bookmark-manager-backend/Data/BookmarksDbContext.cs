using Microsoft.EntityFrameworkCore;
using BookmarkManager.Models;

namespace BookmarkManager.Data
{
    public class BookmarksDbContext : DbContext
    {
        public BookmarksDbContext(DbContextOptions<BookmarksDbContext> options) 
            : base(options)
        {
        }

        public DbSet<Bookmark> Bookmarks { get; set; }
        
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Configure the Bookmark entity
            modelBuilder.Entity<Bookmark>(entity =>
            {
                entity.ToTable("bookmarks");
                
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id").UseIdentityColumn();
                entity.Property(e => e.Title).HasColumnName("title").IsRequired();
                entity.Property(e => e.Url).HasColumnName("url").IsRequired();
                entity.Property(e => e.CreateDate).HasColumnName("create_date");
                entity.Property(e => e.ReadDate).HasColumnName("read_date");
            });
            
            // Add some seed data with UTC DateTime values
            modelBuilder.Entity<Bookmark>().HasData(
                new Bookmark
                {
                    Id = 1,
                    Url = "https://reactjsfromdb.org",
                    Title = "React Documentation",
                    CreateDate = DateTime.SpecifyKind(new DateTime(2023, 1, 15), DateTimeKind.Utc)
                },
                new Bookmark
                {
                    Id = 2,
                    Url = "https://typescript-lang.org",
                    Title = "TypeScript Documentation",
                    CreateDate = DateTime.SpecifyKind(new DateTime(2023, 2, 10), DateTimeKind.Utc),
                    ReadDate = DateTime.SpecifyKind(new DateTime(2023, 2, 12), DateTimeKind.Utc)
                },
                new Bookmark
                {
                    Id = 3,
                    Url = "https://developer.mozilla.org",
                    Title = "MDN Web Docs",
                    CreateDate = DateTime.SpecifyKind(new DateTime(2023, 3, 5), DateTimeKind.Utc)
                }
            );
        }
    }
}