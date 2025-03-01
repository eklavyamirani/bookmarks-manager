using Microsoft.EntityFrameworkCore;
using BookmarkManager.Models;
using BookmarkManager.Data;

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
            return await _context.Bookmarks.ToListAsync();
        }

        public async Task<Bookmark?> GetBookmarkByIdAsync(int id)
        {
            return await _context.Bookmarks.FindAsync(id);
        }

        public async Task<Bookmark> AddBookmarkAsync(Bookmark bookmark)
        {
            bookmark.CreateDate = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Utc);
            bookmark.ReadDate = null;
            
            _context.Bookmarks.Add(bookmark);
            await _context.SaveChangesAsync();
            
            return bookmark;
        }

        public async Task<Bookmark?> UpdateBookmarkAsync(int id, Bookmark updatedBookmark)
        {
            var bookmark = await _context.Bookmarks.FindAsync(id);
            if (bookmark == null)
                return null;
            
            bookmark.Title = updatedBookmark.Title;
            bookmark.Url = updatedBookmark.Url;
            
            await _context.SaveChangesAsync();
            
            return bookmark;
        }

        public async Task<Bookmark?> MarkAsReadAsync(int id)
        {
            var bookmark = await _context.Bookmarks.FindAsync(id);
            if (bookmark == null)
                return null;
            
            bookmark.ReadDate = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Utc);
            await _context.SaveChangesAsync();
            
            return bookmark;
        }

        public async Task<bool> DeleteBookmarkAsync(int id)
        {
            var bookmark = await _context.Bookmarks.FindAsync(id);
            if (bookmark == null)
                return false;
            
            _context.Bookmarks.Remove(bookmark);
            await _context.SaveChangesAsync();
            
            return true;
        }
    }
}