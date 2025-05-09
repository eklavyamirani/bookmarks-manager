using System.Text.Json.Serialization;

namespace BookmarkManager.Models.MCP
{
    public class MCPCreateTaskRequest
    {
        [JsonPropertyName("query")]
        public string Query { get; set; } = string.Empty;
        
        [JsonPropertyName("action")]
        public string Action { get; set; } = string.Empty;
        
        [JsonPropertyName("parameters")]
        public Dictionary<string, string>? Parameters { get; set; }
    }
}
