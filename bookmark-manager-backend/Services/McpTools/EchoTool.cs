using System.ComponentModel;
using ModelContextProtocol.Server;

namespace BookmarkManager.Services.McpTools;

[McpServerToolType]
public class EchoTool
{
    [McpServerTool, Description("Echoes the message back to the client.")]
    public string Echo(string message) => $"hello {message}";
}