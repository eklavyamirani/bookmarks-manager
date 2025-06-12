using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using BookmarkManager.Models;
using BookmarkManager.Services;

namespace BookmarkManager.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // Require authentication for all endpoints
    public class BookmarksController : ControllerBase
    {
        private readonly IBookmarkService _bookmarkService;

        public BookmarksController(IBookmarkService bookmarkService)
        {
            _bookmarkService = bookmarkService;
        }

        // GET: api/bookmarks
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Bookmark>>> GetBookmarks()
        {
            var bookmarks = await _bookmarkService.GetAllBookmarksAsync();
            return Ok(bookmarks);
        }

        // GET api/bookmarks/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Bookmark>> GetBookmark(int id)
        {
            var bookmark = await _bookmarkService.GetBookmarkByIdAsync(id);
            
            if (bookmark == null)
                return NotFound();

            return Ok(bookmark);
        }

        // POST api/bookmarks
        [HttpPost]
        public async Task<ActionResult<Bookmark>> CreateBookmark([FromBody] Bookmark bookmark)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var createdBookmark = await _bookmarkService.AddBookmarkAsync(bookmark);
            return CreatedAtAction(nameof(GetBookmark), new { id = createdBookmark.Id }, createdBookmark);
        }

        // PUT api/bookmarks/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateBookmark(int id, [FromBody] Bookmark bookmark)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _bookmarkService.UpdateBookmarkAsync(id, bookmark);
            
            if (result == null)
                return NotFound();

            return NoContent();
        }

        // PUT api/bookmarks/5/read
        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var result = await _bookmarkService.MarkAsReadAsync(id);
            
            if (result == null)
                return NotFound();

            return Ok(result);
        }

        // DELETE api/bookmarks/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteBookmark(int id)
        {
            var result = await _bookmarkService.DeleteBookmarkAsync(id);
            
            if (!result)
                return NotFound();

            return NoContent();
        }
    }
}
