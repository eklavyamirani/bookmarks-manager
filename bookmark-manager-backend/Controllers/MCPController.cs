using Microsoft.AspNetCore.Mvc;
using BookmarkManager.Models.MCP;
using BookmarkManager.Services.MCP;
using System.Threading;
using System.IO;
using System.Collections.Generic;
using System.Text.Json;

namespace BookmarkManager.Controllers
{
    [ApiController]
    [Route("mcp")]
    public class MCPController : ControllerBase
    {
        private readonly IMCPService _mcpService;
        private readonly ILogger<MCPController> _logger;
        private static readonly SemaphoreSlim _sseConnectionLock = new SemaphoreSlim(1, 1);
        private static List<StreamWriter> _sseClients = new List<StreamWriter>();

        public MCPController(IMCPService mcpService, ILogger<MCPController> logger)
        {
            _mcpService = mcpService;
            _logger = logger;
        }
        
        // POST mcp/initialize
        [HttpPost("initialize")]
        public ActionResult Initialize([FromBody] MCPInitializeRequest request)
        {
            _logger.LogInformation("Received MCP initialize request: {0}", JsonSerializer.Serialize(request));
            var response = new MCPInitializeResponse();
            return Ok(response);
        }

        // GET mcp/initialize
        [HttpGet("initialize")]
        public ActionResult GetInitialize()
        {
            _logger.LogInformation("Received MCP GET initialize request");
            var response = new MCPInitializeResponse();
            return Ok(response);
        }
        
        // GET mcp - Handles SSE connections
        [HttpGet]
        public async Task GetMcp()
        {
            _logger.LogInformation("Received request to mcp endpoint");
            await HandleSSEConnection();
        }
        
        private async Task HandleSSEConnection()
        {
            _logger.LogInformation("Processing SSE connection request");
            
            Response.Headers["Content-Type"] = "text/event-stream";
            Response.Headers["Cache-Control"] = "no-cache";
            Response.Headers["Connection"] = "keep-alive";
            
            // Disable buffering
            await Response.Body.FlushAsync();
            
            // Send the initial connection event
            using var streamWriter = new StreamWriter(Response.Body, leaveOpen: true);
            streamWriter.AutoFlush = true;

            try
            {
                // Send a welcome message
                var initializeEvent = new MCPServerSentEvent
                {
                    Type = "initialize",
                    Data = new MCPInitializeResponse()
                };
                
                var eventText = initializeEvent.ToString();
                _logger.LogInformation("Sending SSE initialize event: {0}", eventText);
                
                await streamWriter.WriteAsync(eventText);
                await streamWriter.FlushAsync();
                
                // Keep the connection open
                await Task.Delay(Timeout.Infinite, HttpContext.RequestAborted);
            }
            catch (TaskCanceledException)
            {
                _logger.LogInformation("SSE client disconnected");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SSE connection");
            }
        }

        // POST mcp/tasks
        [HttpPost("tasks")]
        public async Task<ActionResult<MCPTask>> CreateTask([FromBody] MCPCreateTaskRequest request)
        {
            _logger.LogInformation($"Received task creation request: {request.Action}");
            
            try
            {
                var task = await _mcpService.CreateTaskAsync(request);
                return Created($"/mcp/tasks/{task.Id}", task);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating task");
                return StatusCode(500, new { Error = "Failed to create task", Details = ex.Message });
            }
        }

        // GET mcp/tasks/{taskId}
        [HttpGet("tasks/{taskId}")]
        public async Task<ActionResult<MCPTask>> GetTask(string taskId)
        {
            var task = await _mcpService.GetTaskAsync(taskId);
            if (task == null)
            {
                return NotFound(new { Error = $"Task with ID {taskId} not found." });
            }
            
            return Ok(task);
        }

        // POST mcp/tasks/{taskId}/artifacts
        [HttpPost("tasks/{taskId}/artifacts")]
        public async Task<ActionResult<MCPArtifact>> CreateArtifact(string taskId, [FromBody] MCPCreateArtifactRequest request)
        {
            try
            {
                var artifact = await _mcpService.CreateArtifactAsync(taskId, request);
                return Created($"/mcp/tasks/{taskId}/artifacts/{artifact.Id}", artifact);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { Error = $"Task with ID {taskId} not found." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error creating artifact for task {taskId}");
                return StatusCode(500, new { Error = "Failed to create artifact", Details = ex.Message });
            }
        }

        // GET mcp/tasks/{taskId}/artifacts/{artifactId}
        [HttpGet("tasks/{taskId}/artifacts/{artifactId}")]
        public async Task<ActionResult<MCPArtifact>> GetArtifact(string taskId, string artifactId)
        {
            var artifact = await _mcpService.GetArtifactAsync(taskId, artifactId);
            if (artifact == null)
            {
                return NotFound(new { Error = $"Artifact with ID {artifactId} not found in task {taskId}." });
            }
            
            return Ok(artifact);
        }

        // PATCH mcp/tasks/{taskId}
        [HttpPatch("tasks/{taskId}")]
        public async Task<ActionResult<MCPTask>> UpdateTaskStatus(string taskId, [FromBody] Dictionary<string, string> updates)
        {
            if (!updates.TryGetValue("status", out string? status))
            {
                return BadRequest(new { Error = "Status field is required." });
            }

            bool success = status.ToLower() == "completed";
            var task = await _mcpService.CompleteTaskAsync(taskId, success);
            
            if (task == null)
            {
                return NotFound(new { Error = $"Task with ID {taskId} not found." });
            }
            
            return Ok(task);
        }
    }
}
