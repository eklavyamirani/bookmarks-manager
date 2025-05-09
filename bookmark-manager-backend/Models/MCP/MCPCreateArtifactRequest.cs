using System.Text.Json.Serialization;

namespace BookmarkManager.Models.MCP
{
    public class MCPCreateArtifactRequest
    {
        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty;
        
        [JsonPropertyName("content")]
        public object? Content { get; set; }
    }
}
