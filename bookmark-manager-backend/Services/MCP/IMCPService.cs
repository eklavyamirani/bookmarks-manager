using BookmarkManager.Models.MCP;

namespace BookmarkManager.Services.MCP
{
    public interface IMCPService
    {
        Task<MCPTask> CreateTaskAsync(MCPCreateTaskRequest request);
        Task<MCPTask?> GetTaskAsync(string taskId);
        Task<MCPArtifact> CreateArtifactAsync(string taskId, MCPCreateArtifactRequest request);
        Task<MCPArtifact?> GetArtifactAsync(string taskId, string artifactId);
        Task<MCPTask?> CompleteTaskAsync(string taskId, bool success = true);
        Task<List<MCPTask>> GetAllTasksAsync();
    }
}
