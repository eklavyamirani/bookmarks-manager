using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using bookmark_manager_backend.Models.Generated;

namespace bookmark_manager_backend.Data;

public partial class BookmarksDbContext : DbContext
{
    public BookmarksDbContext(DbContextOptions<BookmarksDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<SavedLink> SavedLinks { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SavedLink>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("saved_links_pkey");

            entity.ToTable("saved_links");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.IpAddress)
                .HasMaxLength(45)
                .HasColumnName("ip_address");
            entity.Property(e => e.Link)
                .HasMaxLength(1000)
                .HasColumnName("link");
            entity.Property(e => e.ReadDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("read_date");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasColumnName("title");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
