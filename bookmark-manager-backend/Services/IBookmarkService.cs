using BookmarkManager.Models;

namespace BookmarkManager.Services
{
    public interface IBookmarkService
    {
        Task<IEnumerable<Bookmark>> GetAllBookmarksAsync();
        Task<Bookmark?> GetBookmarkByIdAsync(int id);
        Task<Bookmark> AddBookmarkAsync(Bookmark bookmark);
        Task<Bookmark?> UpdateBookmarkAsync(int id, Bookmark bookmark);
        Task<Bookmark?> MarkAsReadAsync(int id);
        Task<bool> DeleteBookmarkAsync(int id);
    }
}