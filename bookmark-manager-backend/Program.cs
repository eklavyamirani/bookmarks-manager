using BookmarkManager.Services;
using BookmarkManager.Services.MCP;
using bookmark_manager_backend.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Builder;

namespace bookmark_manager_backend;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Configure Kestrel for SSE
        builder.Services.Configure<Microsoft.AspNetCore.Server.Kestrel.Core.KestrelServerOptions>(options =>
        {
            options.AllowSynchronousIO = true;
        });

        // Read the configuration to determine which implementation to use
        bool usePostgres = builder.Configuration.GetValue<bool>("UsePostgres");

        // Add the bookmark service implementation based on the configuration
        if (usePostgres)
        {
            // Get PostgreSQL connection details from environment variables
            string postgresUser = Environment.GetEnvironmentVariable("POSTGRES_USER") 
                ?? throw new InvalidOperationException("POSTGRES_USER environment variable is not set");
            string postgresPassword = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD") 
                ?? throw new InvalidOperationException("POSTGRES_PASSWORD environment variable is not set");
            string postgresDb = Environment.GetEnvironmentVariable("POSTGRES_DB") 
                ?? throw new InvalidOperationException("POSTGRES_DB environment variable is not set");
            string postgresHost = Environment.GetEnvironmentVariable("POSTGRES_HOST") 
                ?? throw new InvalidOperationException("POSTGRES_HOST environment variable is not set");
            
            // Get the connection string template from configuration
            string connectionStringTemplate = builder.Configuration.GetConnectionString("PostgresConnection") ?? 
                "Host={PostgresHost};Database={PostgresDb};Username={PostgresUser};Password={PostgresPassword}";
            
            // Replace placeholders with actual values
            string connectionString = connectionStringTemplate
                .Replace("{PostgresHost}", postgresHost)
                .Replace("{PostgresUser}", postgresUser)
                .Replace("{PostgresPassword}", postgresPassword)
                .Replace("{PostgresDb}", postgresDb);
                
            // Removed timestamp behavior setting for now
            
            // Configure PostgreSQL connection with the built connection string
            builder.Services.AddDbContext<BookmarksDbContext>(options =>
                options.UseNpgsql(connectionString, npgsqlOptions =>
                    npgsqlOptions.SetPostgresVersion(9, 6)));
            
            // Add the PostgreSQL bookmark service
            builder.Services.AddScoped<BookmarkManager.Services.IBookmarkService, BookmarkManager.Services.PostgresBookmarkService>();
            
            // Log that we're using PostgreSQL
            builder.Services.AddLogging(logging =>
            {
                logging.AddConsole();
                logging.AddDebug();
            });
            
            builder.Services.AddHttpContextAccessor();
            
            builder.Logging.AddConsole();
            builder.Logging.AddDebug();
            
            builder.Services.AddLogging(logging =>
            {
                logging.AddConsole();
                logging.AddDebug();
            });
            
            // Log PostgreSQL connections
            Console.WriteLine($"Using PostgreSQL implementation for bookmark service");
            Console.WriteLine($"PostgreSQL connection: Host={postgresHost};Database={postgresDb};Username={postgresUser}");
        }
        else
        {
            // Add the mock bookmark service
            builder.Services.AddSingleton<BookmarkManager.Services.IBookmarkService, BookmarkManager.Services.MockBookmarkService>();
            
            // Log that we're using the mock implementation
            Console.WriteLine($"Using mock implementation for bookmark service");
        }

        // Configure CORS for SSE connections
        builder.Services.AddCors(options =>
        {
            options.AddDefaultPolicy(policy =>
            {
                policy.AllowAnyOrigin()
                      .AllowAnyHeader()
                      .AllowAnyMethod();
                // Note: Can't use AllowCredentials with AllowAnyOrigin
            });
        });
        
        // Register the MCP service
        builder.Services.AddSingleton<BookmarkManager.Services.MCP.IMCPService, BookmarkManager.Services.MCP.MCPService>();

        builder.Services.AddControllers()
               .AddJsonOptions(options => {
                   // Configure JSON serialization settings for MCP
                   options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
                   options.JsonSerializerOptions.WriteIndented = true;
               });
        
        // Add OpenAPI/Swagger
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();

        var app = builder.Build();

        // Configure the HTTP request pipeline - order matters!
        
        // Create and migrate the database if using PostgreSQL
        if (usePostgres)
        {
            using (var scope = app.Services.CreateScope())
            {
                var dbContext = scope.ServiceProvider.GetRequiredService<BookmarksDbContext>();
                // Ensure the database exists
                dbContext.Database.EnsureCreated();
            }
        }
        
        // CORS middleware should be one of the first in the pipeline
        app.UseCors();

        // Other middleware
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseHttpsRedirection();

        app.UseAuthorization();
        
        app.MapControllers();

        app.Run();
    }
}
