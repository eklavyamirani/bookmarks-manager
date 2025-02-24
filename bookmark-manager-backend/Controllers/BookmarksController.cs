using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BookmarkManager.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BookmarksController : ControllerBase
    {
        // GET: api/<bookmarks>
        [HttpGet]
        public IEnumerable<string> Get()
        {
            return new string[] { "value1", "value2" };
        }

        // GET api/<bookmarks>/5
        [HttpGet("{id}")]
        public string Get(int id)
        {
            return "value";
        }

        // POST api/<bookmarks>
        [HttpPost]
        public void Post([FromBody] string value)
        {
        }

        // PUT api/<bookmarks>/5
        [HttpPut("{id}")]
        public void Put(int id, [FromBody] string value)
        {
        }

        // DELETE api/<bookmarks>/5
        [HttpDelete("{id}")]
        public void Delete(int id)
        {
        }
    }
}
