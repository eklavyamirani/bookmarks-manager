using BookmarkManager.Models;
using BookmarkManager.Models.MCP;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BookmarkManager.Services.MCP
{
    public class MCPService : IMCPService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<MCPService> _logger;
        private readonly Dictionary<string, MCPTask> _tasks = new();

        public MCPService(IServiceProvider serviceProvider, ILogger<MCPService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }
        
        private IServiceScope CreateScope()
        {
            return _serviceProvider.CreateScope();
        }
        
        private IBookmarkService GetBookmarkService(IServiceScope scope)
        {
            return scope.ServiceProvider.GetRequiredService<IBookmarkService>();
        }

        public async Task<MCPTask> CreateTaskAsync(MCPCreateTaskRequest request)
        {
            var task = new MCPTask
            {
                Request = new MCPRequest
                {
                    Query = request.Query,
                    Action = request.Action,
                    Parameters = request.Parameters ?? new Dictionary<string, string>()
                }
            };

            _tasks[task.Id] = task;
            
            // If the task is a bookmark operation, process it
            if (task.Request.Action.StartsWith("bookmark."))
            {
                await ProcessBookmarkTaskAsync(task);
            }
            
            return task;
        }

        public Task<MCPTask?> GetTaskAsync(string taskId)
        {
            if (_tasks.TryGetValue(taskId, out MCPTask? task))
            {
                return Task.FromResult<MCPTask?>(task);
            }
            return Task.FromResult<MCPTask?>(null);
        }

        public Task<MCPArtifact> CreateArtifactAsync(string taskId, MCPCreateArtifactRequest request)
        {
            if (!_tasks.TryGetValue(taskId, out MCPTask? task))
            {
                throw new KeyNotFoundException($"Task with ID {taskId} not found.");
            }

            var artifact = new MCPArtifact
            {
                Type = request.Type,
                Content = request.Content
            };

            task.Artifacts[artifact.Id] = artifact;
            task.UpdatedAt = DateTime.UtcNow;

            return Task.FromResult(artifact);
        }

        public Task<MCPArtifact?> GetArtifactAsync(string taskId, string artifactId)
        {
            if (!_tasks.TryGetValue(taskId, out MCPTask? task))
            {
                return Task.FromResult<MCPArtifact?>(null);
            }

            if (task.Artifacts.TryGetValue(artifactId, out MCPArtifact? artifact))
            {
                return Task.FromResult<MCPArtifact?>(artifact);
            }

            return Task.FromResult<MCPArtifact?>(null);
        }
        
        public Task<List<MCPTask>> GetAllTasksAsync()
        {
            return Task.FromResult(_tasks.Values.ToList());
        }

        public Task<MCPTask?> CompleteTaskAsync(string taskId, bool success = true)
        {
            if (!_tasks.TryGetValue(taskId, out MCPTask? task))
            {
                return Task.FromResult<MCPTask?>(null);
            }

            task.Status = success ? "completed" : "failed";
            task.UpdatedAt = DateTime.UtcNow;

            return Task.FromResult<MCPTask?>(task);
        }

        private async Task ProcessBookmarkTaskAsync(MCPTask task)
        {
            try
            {
                var action = task.Request?.Action?.ToLower() ?? "";
                MCPArtifact artifact;
                using var scope = CreateScope();
                var bookmarkService = GetBookmarkService(scope);

                switch (action)
                {
                    case "bookmark.list":
                        var bookmarks = await bookmarkService.GetAllBookmarksAsync();
                        artifact = new MCPArtifact
                        {
                            Type = "bookmarks.list",
                            Content = bookmarks
                        };
                        task.Artifacts[artifact.Id] = artifact;
                        await CompleteTaskAsync(task.Id);
                        break;

                    case "bookmark.get":
                        if (task.Request.Parameters.TryGetValue("id", out string? idStr) && int.TryParse(idStr, out int id))
                        {
                            var bookmark = await bookmarkService.GetBookmarkByIdAsync(id);
                            if (bookmark != null)
                            {
                                artifact = new MCPArtifact
                                {
                                    Type = "bookmark.single",
                                    Content = bookmark
                                };
                                task.Artifacts[artifact.Id] = artifact;
                                await CompleteTaskAsync(task.Id);
                            }
                            else
                            {
                                artifact = new MCPArtifact
                                {
                                    Type = "error",
                                    Content = $"Bookmark with ID {id} not found."
                                };
                                task.Artifacts[artifact.Id] = artifact;
                                await CompleteTaskAsync(task.Id, false);
                            }
                        }
                        else
                        {
                            artifact = new MCPArtifact
                            {
                                Type = "error",
                                Content = "Missing or invalid 'id' parameter."
                            };
                            task.Artifacts[artifact.Id] = artifact;
                            await CompleteTaskAsync(task.Id, false);
                        }
                        break;

                    case "bookmark.create":
                        if (task.Request.Parameters.TryGetValue("url", out string? url))
                        {
                            var newBookmark = new Bookmark
                            {
                                Url = url,
                                Title = task.Request.Parameters.TryGetValue("title", out string? title) ? title : url,
                                // Let the service handle the CreateDate to avoid DateTime UTC issues
                                CreateDate = DateTime.Now
                            };
                            
                            try {
                                var createdBookmark = await bookmarkService.AddBookmarkAsync(newBookmark);
                                artifact = new MCPArtifact
                                {
                                    Type = "bookmark.created",
                                    Content = createdBookmark
                                };
                                task.Artifacts[artifact.Id] = artifact;
                                await CompleteTaskAsync(task.Id);
                            }
                            catch (Exception ex) {
                                _logger.LogError(ex, "Error creating bookmark");
                                artifact = new MCPArtifact
                                {
                                    Type = "error",
                                    Content = $"Error creating bookmark: {ex.Message}"
                                };
                                task.Artifacts[artifact.Id] = artifact;
                                await CompleteTaskAsync(task.Id, false);
                            }
                        }
                        else
                        {
                            artifact = new MCPArtifact
                            {
                                Type = "error",
                                Content = "Missing required 'url' parameter."
                            };
                            task.Artifacts[artifact.Id] = artifact;
                            await CompleteTaskAsync(task.Id, false);
                        }
                        break;

                    case "bookmark.update":
                        if (task.Request.Parameters.TryGetValue("id", out string? updateIdStr) && int.TryParse(updateIdStr, out int updateId))
                        {
                            var existingBookmark = await bookmarkService.GetBookmarkByIdAsync(updateId);
                            if (existingBookmark != null)
                            {
                                if (task.Request.Parameters.TryGetValue("url", out string? newUrl))
                                {
                                    existingBookmark.Url = newUrl;
                                }
                                if (task.Request.Parameters.TryGetValue("title", out string? newTitle))
                                {
                                    existingBookmark.Title = newTitle;
                                }
                                
                                var updatedBookmark = await bookmarkService.UpdateBookmarkAsync(updateId, existingBookmark);
                                if (updatedBookmark != null)
                                {
                                    artifact = new MCPArtifact
                                    {
                                        Type = "bookmark.updated",
                                        Content = updatedBookmark
                                    };
                                    task.Artifacts[artifact.Id] = artifact;
                                    await CompleteTaskAsync(task.Id);
                                }
                                else
                                {
                                    artifact = new MCPArtifact
                                    {
                                        Type = "error",
                                        Content = $"Failed to update bookmark with ID {updateId}."
                                    };
                                    task.Artifacts[artifact.Id] = artifact;
                                    await CompleteTaskAsync(task.Id, false);
                                }
                            }
                            else
                            {
                                artifact = new MCPArtifact
                                {
                                    Type = "error",
                                    Content = $"Bookmark with ID {updateId} not found."
                                };
                                task.Artifacts[artifact.Id] = artifact;
                                await CompleteTaskAsync(task.Id, false);
                            }
                        }
                        else
                        {
                            artifact = new MCPArtifact
                            {
                                Type = "error",
                                Content = "Missing or invalid 'id' parameter."
                            };
                            task.Artifacts[artifact.Id] = artifact;
                            await CompleteTaskAsync(task.Id, false);
                        }
                        break;

                    case "bookmark.markasread":
                        if (task.Request.Parameters.TryGetValue("id", out string? markAsReadIdStr) && int.TryParse(markAsReadIdStr, out int markAsReadId))
                        {
                            var markedBookmark = await bookmarkService.MarkAsReadAsync(markAsReadId);
                            if (markedBookmark != null)
                            {
                                artifact = new MCPArtifact
                                {
                                    Type = "bookmark.marked_read",
                                    Content = markedBookmark
                                };
                                task.Artifacts[artifact.Id] = artifact;
                                await CompleteTaskAsync(task.Id);
                            }
                            else
                            {
                                artifact = new MCPArtifact
                                {
                                    Type = "error",
                                    Content = $"Bookmark with ID {markAsReadId} not found."
                                };
                                task.Artifacts[artifact.Id] = artifact;
                                await CompleteTaskAsync(task.Id, false);
                            }
                        }
                        else
                        {
                            artifact = new MCPArtifact
                            {
                                Type = "error",
                                Content = "Missing or invalid 'id' parameter."
                            };
                            task.Artifacts[artifact.Id] = artifact;
                            await CompleteTaskAsync(task.Id, false);
                        }
                        break;

                    case "bookmark.delete":
                        if (task.Request.Parameters.TryGetValue("id", out string? deleteIdStr) && int.TryParse(deleteIdStr, out int deleteId))
                        {
                            var deleteResult = await bookmarkService.DeleteBookmarkAsync(deleteId);
                            if (deleteResult)
                            {
                                artifact = new MCPArtifact
                                {
                                    Type = "bookmark.deleted",
                                    Content = new { Success = true, Message = $"Bookmark with ID {deleteId} deleted successfully." }
                                };
                                task.Artifacts[artifact.Id] = artifact;
                                await CompleteTaskAsync(task.Id);
                            }
                            else
                            {
                                artifact = new MCPArtifact
                                {
                                    Type = "error",
                                    Content = $"Failed to delete bookmark with ID {deleteId}."
                                };
                                task.Artifacts[artifact.Id] = artifact;
                                await CompleteTaskAsync(task.Id, false);
                            }
                        }
                        else
                        {
                            artifact = new MCPArtifact
                            {
                                Type = "error",
                                Content = "Missing or invalid 'id' parameter."
                            };
                            task.Artifacts[artifact.Id] = artifact;
                            await CompleteTaskAsync(task.Id, false);
                        }
                        break;
                        
                    default:
                        artifact = new MCPArtifact
                        {
                            Type = "error",
                            Content = $"Unsupported bookmark action: {action}"
                        };
                        task.Artifacts[artifact.Id] = artifact;
                        await CompleteTaskAsync(task.Id, false);
                        break;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing bookmark task");
                var artifact = new MCPArtifact
                {
                    Type = "error",
                    Content = $"An error occurred: {ex.Message}"
                };
                task.Artifacts[artifact.Id] = artifact;
                await CompleteTaskAsync(task.Id, false);
            }
        }
    }
}
