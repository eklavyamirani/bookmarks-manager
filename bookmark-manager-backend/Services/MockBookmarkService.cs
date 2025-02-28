using BookmarkManager.Models;

namespace BookmarkManager.Services
{
    public class MockBookmarkService : IBookmarkService
    {
        private List<Bookmark> _bookmarks;
        
        public MockBookmarkService()
        {
            // Initialize with some mock data
            _bookmarks = new List<Bookmark>
            {
                new Bookmark
                {
                    Id = 1,
                    Url = "https://reactjs.org",
                    Title = "React Documentation",
                    CreateDate = new DateTime(2023, 1, 15),
                    ReadDate = null
                },
                new Bookmark
                {
                    Id = 2,
                    Url = "https://typescript-lang.org",
                    Title = "TypeScript Documentation",
                    CreateDate = new DateTime(2023, 2, 10),
                    ReadDate = new DateTime(2023, 2, 12)
                },
                new Bookmark
                {
                    Id = 3,
                    Url = "https://developer.mozilla.org",
                    Title = "MDN Web Docs",
                    CreateDate = new DateTime(2023, 3, 5),
                    ReadDate = null
                }
            };
        }
        
        public Task<IEnumerable<Bookmark>> GetAllBookmarksAsync()
        {
            return Task.FromResult<IEnumerable<Bookmark>>(_bookmarks.ToList());
        }
        
        public Task<Bookmark?> GetBookmarkByIdAsync(int id)
        {
            var bookmark = _bookmarks.FirstOrDefault(b => b.Id == id);
            return Task.FromResult(bookmark);
        }
        
        public Task<Bookmark> AddBookmarkAsync(Bookmark bookmark)
        {
            // Generate a new ID
            int newId = _bookmarks.Count > 0 ? _bookmarks.Max(b => b.Id) + 1 : 1;
            
            // Set the ID and create date
            bookmark.Id = newId;
            bookmark.CreateDate = DateTime.Now;
            bookmark.ReadDate = null;
            
            _bookmarks.Add(bookmark);
            return Task.FromResult(bookmark);
        }
        
        public Task<Bookmark?> UpdateBookmarkAsync(int id, Bookmark updatedBookmark)
        {
            var existingBookmark = _bookmarks.FirstOrDefault(b => b.Id == id);
            if (existingBookmark == null)
                return Task.FromResult<Bookmark?>(null);
                
            existingBookmark.Title = updatedBookmark.Title;
            existingBookmark.Url = updatedBookmark.Url;
            
            return Task.FromResult<Bookmark?>(existingBookmark);
        }
        
        public Task<Bookmark?> MarkAsReadAsync(int id)
        {
            var bookmark = _bookmarks.FirstOrDefault(b => b.Id == id);
            if (bookmark == null)
                return Task.FromResult<Bookmark?>(null);
                
            bookmark.ReadDate = DateTime.Now;
            return Task.FromResult<Bookmark?>(bookmark);
        }
        
        public Task<bool> DeleteBookmarkAsync(int id)
        {
            var bookmark = _bookmarks.FirstOrDefault(b => b.Id == id);
            if (bookmark == null)
                return Task.FromResult(false);
                
            _bookmarks.Remove(bookmark);
            return Task.FromResult(true);
        }
    }
}