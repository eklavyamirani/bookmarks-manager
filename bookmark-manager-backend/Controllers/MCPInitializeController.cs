using Microsoft.AspNetCore.Mvc;
using BookmarkManager.Models.MCP;
using BookmarkManager.Services.MCP;

namespace BookmarkManager.Controllers
{
    [ApiController]
    [Route("mcp")]
    public class MCPInitializeController : ControllerBase
    {
        private readonly IMCPService _mcpService;
        private readonly ILogger<MCPInitializeController> _logger;

        public MCPInitializeController(IMCPService mcpService, ILogger<MCPInitializeController> logger)
        {
            _mcpService = mcpService;
            _logger = logger;
        }

        // POST mcp/initialize
        [HttpPost("initialize")]
        public ActionResult Initialize([FromBody] MCPInitializeRequest request)
        {
            _logger.LogInformation("Received MCP initialize request via dedicated endpoint");
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
    }
}
