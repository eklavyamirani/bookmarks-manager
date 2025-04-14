using Microsoft.EntityFrameworkCore;
using BookmarkManager.Models;
using bookmark_manager_backend.Models.Generated;
using bookmark_manager_backend.Data;

namespace BookmarkManager.Services
{
    public class PostgresBookmarkService : IBookmarkService
    {
        private readonly BookmarksDbContext _context;

        public PostgresBookmarkService(BookmarksDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Bookmark>> GetAllBookmarksAsync()
        {
            var savedLinks = await _context.SavedLinks.ToListAsync();
            return savedLinks.Select(ConvertToBookmark);
        }

        public async Task<Bookmark?> GetBookmarkByIdAsync(int id)
        {
            var savedLink = await _context.SavedLinks.FindAsync(id);
            return savedLink != null ? ConvertToBookmark(savedLink) : null;
        }

        public async Task<Bookmark> AddBookmarkAsync(Bookmark bookmark)
        {
            var savedLink = ConvertToSavedLink(bookmark);
            savedLink.CreatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Utc);
            savedLink.ReadDate = null;
            
            _context.SavedLinks.Add(savedLink);
            await _context.SaveChangesAsync();
            
            return bookmark;
        }

        public async Task<Bookmark?> UpdateBookmarkAsync(int id, Bookmark updatedBookmark)
        {
            var savedLink = await _context.SavedLinks.FindAsync(id);
            if (savedLink == null)
                return null;
            
            savedLink.Title = updatedBookmark.Title;
            savedLink.Link = updatedBookmark.Url;
            
            await _context.SaveChangesAsync();
            
            return ConvertToBookmark(savedLink);
        }

        public async Task<Bookmark?> MarkAsReadAsync(int id)
        {
            var savedLink = await _context.SavedLinks.FindAsync(id);
            if (savedLink == null)
                return null;
            
            savedLink.ReadDate = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Utc);
            await _context.SaveChangesAsync();
            
            return ConvertToBookmark(savedLink);
        }

        public async Task<bool> DeleteBookmarkAsync(int id)
        {
            var savedLink = await _context.SavedLinks.FindAsync(id);
            if (savedLink == null)
                return false;
            
            _context.SavedLinks.Remove(savedLink);
            await _context.SaveChangesAsync();
            
            return true;
        }
        
        // Helper method to convert from the DB-generated SavedLink model to the application's Bookmark model
        private Bookmark ConvertToBookmark(SavedLink savedLink)
        {
            return new Bookmark
            {
                Id = savedLink.Id,
                Url = savedLink.Link!,
                Title = savedLink.Title,
                CreateDate = savedLink.CreatedAt,
                ReadDate = savedLink.ReadDate
            };
        }
        
        // Helper method to convert from the application's Bookmark model to the DB-generated SavedLink model
        private SavedLink ConvertToSavedLink(Bookmark bookmark)
        {
            return new SavedLink
            {
                Id = bookmark.Id,
                Link = bookmark.Url,
                Title = bookmark.Title,
                CreatedAt = bookmark.CreateDate,
                ReadDate = bookmark.ReadDate
            };
        }
    }
}