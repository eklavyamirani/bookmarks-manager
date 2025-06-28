using System.ComponentModel;
using BookmarkManager.Models;
using ModelContextProtocol.Server;

namespace BookmarkManager.Services.McpTools
{
    [McpServerToolType]
    public class BookmarksTool
    {
        private readonly IBookmarkService _bookmarkService;

        public BookmarksTool(IBookmarkService bookmarkService)
        {
            _bookmarkService = bookmarkService;
        }

        [McpServerTool, Description("Get all bookmarks")]
        public async Task<IEnumerable<Bookmark>> GetAllBookmarks()
        {
            return await _bookmarkService.GetAllBookmarksAsync();
        }

        [McpServerTool, Description("Get a bookmark by its ID")]
        public async Task<Bookmark?> GetBookmark(int id)
        {
            return await _bookmarkService.GetBookmarkByIdAsync(id);
        }

        [McpServerTool, Description("Add a new bookmark with a URL and optional title")]
        public async Task<Bookmark> AddBookmark(string url, string? title = null)
        {
            var bookmark = new Bookmark
            {
                Url = url,
                Title = title ?? url, // Use the URL as the title if none is provided
                CreateDate = DateTime.UtcNow
            };

            return await _bookmarkService.AddBookmarkAsync(bookmark);
        }

        [McpServerTool, Description("Mark a bookmark as read by its ID")]
        public async Task<Bookmark?> MarkAsRead(int id)
        {
            return await _bookmarkService.MarkAsReadAsync(id);
        }

        [McpServerTool, Description("Delete a bookmark by its ID")]
        public async Task<bool> DeleteBookmark(int id)
        {
            return await _bookmarkService.DeleteBookmarkAsync(id);
        }

        [McpServerTool, Description("Search bookmarks by title or URL")]
        public async Task<IEnumerable<Bookmark>> SearchBookmarks(string searchTerm)
        {
            var bookmarks = await _bookmarkService.GetAllBookmarksAsync();
            return bookmarks.Where(b => 
                (b.Title?.Contains(searchTerm, StringComparison.OrdinalIgnoreCase) ?? false) || 
                b.Url.Contains(searchTerm, StringComparison.OrdinalIgnoreCase));
        }
    }
}
