using System.Text.Json.Serialization;

namespace BookmarkManager.Models.MCP
{
    public class MCPTask
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [JsonPropertyName("status")]
        public string Status { get; set; } = "in_progress";
        
        [JsonPropertyName("request")]
        public MCPRequest? Request { get; set; }
        
        [JsonPropertyName("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        [JsonPropertyName("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        [JsonPropertyName("artifacts")]
        public Dictionary<string, MCPArtifact> Artifacts { get; set; } = new Dictionary<string, MCPArtifact>();
    }
}
