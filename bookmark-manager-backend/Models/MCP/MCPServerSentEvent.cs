using System.Text.Json;

namespace BookmarkManager.Models.MCP
{
    public class MCPServerSentEvent
    {
        public string Type { get; set; } = "event";
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public object Data { get; set; } = new object();

        public override string ToString()
        {
            var data = JsonSerializer.Serialize(Data, new JsonSerializerOptions { 
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = false
            });
            
            return $"event: {Type}\nid: {Id}\ndata: {data}\n\n";
        }
    }
}
