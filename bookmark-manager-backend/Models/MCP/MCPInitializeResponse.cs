using System.Text.Json.Serialization;

namespace BookmarkManager.Models.MCP
{
    public class MCPInitializeResponse
    {
        [JsonPropertyName("protocol")]
        public string Protocol { get; set; } = "mcp/1";

        [JsonPropertyName("name")]
        public string Name { get; set; } = "Bookmarks Manager MCP Server";

        [JsonPropertyName("capabilities")]
        public Dictionary<string, object> Capabilities { get; set; } = new Dictionary<string, object>
        {
            { "actions", new List<string> { 
                "bookmark.list", 
                "bookmark.get", 
                "bookmark.create",
                "bookmark.update",
                "bookmark.markasread",
                "bookmark.delete" 
            }}
        };
    }
}
