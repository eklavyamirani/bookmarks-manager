using System.Text.Json.Serialization;

namespace BookmarkManager.Models.MCP
{
    public class MCPInitializeRequest
    {
        [JsonPropertyName("protocol")]
        public string? Protocol { get; set; }

        [JsonPropertyName("capabilities")]
        public Dictionary<string, object>? Capabilities { get; set; }
    }
}
