using System.Text.Json.Serialization;

namespace BookmarkManager.Models
{
    public class Bookmark
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }
        
        [JsonPropertyName("link")]
        public string Url { get; set; } = string.Empty;
        
        [JsonPropertyName("title")]
        public string? Title { get; set; } = string.Empty;
        
        [JsonPropertyName("created_at")]
        public DateTime CreateDate { get; set; }
        
        [JsonPropertyName("read_date")]
        public DateTime? ReadDate { get; set; }
    }
}