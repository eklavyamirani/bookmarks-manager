using bookmark_manager_backend.Data;
using Microsoft.EntityFrameworkCore;

namespace bookmark_manager_backend;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

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

            // Configure PostgreSQL connection with the built connection string
            builder.Services.AddDbContext<BookmarksDbContext>(options =>
                options.UseNpgsql(connectionString));

            // Add the PostgreSQL bookmark service
            builder.Services.AddScoped<BookmarkManager.Services.IBookmarkService, BookmarkManager.Services.PostgresBookmarkService>();

            // Log that we're using PostgreSQL
            builder.Services.AddLogging(logging =>
            {
                logging.AddConsole().AddFilter(level => level >= LogLevel.Trace);
            });

            var logger = LoggerFactory.Create(builder => builder.AddConsole())
                                      .CreateLogger<Program>();
            logger.LogInformation("Using PostgreSQL implementation for bookmark service");
            logger.LogInformation($"PostgreSQL connection: Host={postgresHost};Database={postgresDb};Username={postgresUser}");
        }
        else
        {
            // Use the mock bookmark service
            builder.Services.AddSingleton<BookmarkManager.Services.IBookmarkService, BookmarkManager.Services.MockBookmarkService>();

            // Log that we're using the mock implementation
            var logger = LoggerFactory.Create(builder => builder.AddConsole())
                                      .CreateLogger<Program>();
            logger.LogInformation("Using mock implementation for bookmark service");
        }

        var mcpBuilder = builder.Services.AddMcpServer()
            .WithHttpTransport()
            .WithToolsFromAssembly();

        // Configure a more permissive CORS policy
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

        builder.Services.AddControllers();
        if (builder.Environment.IsDevelopment())
        {
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();
        }

        // Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
        builder.Services.AddOpenApi();

        var app = builder.Build();

        // Configure the HTTP request pipeline - order matters!
        
        // Create and migrate the database if using PostgreSQL
        if (usePostgres)
        {
            using (var scope = app.Services.CreateScope())
            {
                var dbContext = scope.ServiceProvider.GetRequiredService<BookmarksDbContext>();
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
            app.MapOpenApi();
        }

        app.UseRouting();
        
        app.UseHttpsRedirection();
        
        app.UseAuthorization();
        
        app.MapControllers();

        app.MapMcp("mcp");
        app.Run();
    }
}
