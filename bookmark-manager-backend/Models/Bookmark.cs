using System.Text.Json.Serialization;

namespace BookmarkManager.Models
{
    public class Bookmark
    {
        public int Id { get; set; }
        
        public string Url { get; set; } = string.Empty;
        
        public string Title { get; set; } = string.Empty;
        
        [JsonPropertyName("create_date")]
        public DateTime CreateDate { get; set; }
        
        [JsonPropertyName("read_date")]
        public DateTime? ReadDate { get; set; }
    }
}