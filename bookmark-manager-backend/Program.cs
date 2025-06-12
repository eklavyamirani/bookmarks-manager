using BookmarkManager.Services;
using bookmark_manager_backend.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.OAuth;
using System.Security.Claims;

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
                logging.AddConsole().AddFilter(level => level >= LogLevel.Information);
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

        // Configure a more permissive CORS policy that supports credentials
        builder.Services.AddCors(options =>
        {
            options.AddDefaultPolicy(policy =>
            {
                policy.WithOrigins("http://localhost:3000", "http://localhost:8080") // Add your frontend URLs
                      .AllowAnyHeader()
                      .AllowAnyMethod()
                      .AllowCredentials(); // Required for authentication cookies
            });
        });

        // Add authentication services
        builder.Services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = "Cookies";
            options.DefaultSignInScheme = "Cookies";
            options.DefaultChallengeScheme = "GitHub";
        })
        .AddCookie("Cookies")
        .AddOAuth("GitHub", options =>
        {
            options.ClientId = Environment.GetEnvironmentVariable("GITHUB_CLIENT_ID") 
                ?? throw new InvalidOperationException("GITHUB_CLIENT_ID environment variable is not set");
            options.ClientSecret = Environment.GetEnvironmentVariable("GITHUB_CLIENT_SECRET") 
                ?? throw new InvalidOperationException("GITHUB_CLIENT_SECRET environment variable is not set");
            
            options.AuthorizationEndpoint = "https://github.com/login/oauth/authorize";
            options.TokenEndpoint = "https://github.com/login/oauth/access_token";
            options.UserInformationEndpoint = "https://api.github.com/user";
            
            options.Scope.Add("user:email");
            
            options.ClaimActions.MapJsonKey(ClaimTypes.NameIdentifier, "login");
            options.ClaimActions.MapJsonKey(ClaimTypes.Name, "name");
            options.ClaimActions.MapJsonKey("urn:github:url", "html_url");
            
            options.Events.OnCreatingTicket = async context =>
            {
                var request = new HttpRequestMessage(HttpMethod.Get, context.Options.UserInformationEndpoint);
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", context.AccessToken);
                request.Headers.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));

                var response = await context.Backchannel.SendAsync(request, context.HttpContext.RequestAborted);
                response.EnsureSuccessStatusCode();

                var user = System.Text.Json.JsonDocument.Parse(await response.Content.ReadAsStringAsync());
                context.RunClaimActions(user.RootElement);
            };
        });

        builder.Services.AddAuthorization();

        builder.Services.AddControllers();
        // Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
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

        app.UseRouting();
        
        app.UseHttpsRedirection();
        
        app.UseAuthentication();
        app.UseAuthorization();
        
        app.MapControllers();

        // Add authentication endpoints
        app.MapGet("/auth/login", (HttpContext context) =>
        {
            return Results.Challenge(new AuthenticationProperties
            {
                RedirectUri = "/auth/callback"
            }, new List<string> { "GitHub" });
        });

        app.MapGet("/auth/callback", async (HttpContext context) =>
        {
            var result = await context.AuthenticateAsync();
            if (result.Succeeded)
            {
                return Results.Redirect("/?auth=success");
            }
            return Results.Redirect("/?auth=failed");
        });

        app.MapPost("/auth/logout", async (HttpContext context) =>
        {
            await context.SignOutAsync("Cookies");
            return Results.Ok(new { message = "Logged out successfully" });
        });

        app.MapGet("/auth/user", (HttpContext context) =>
        {
            if (context.User.Identity?.IsAuthenticated == true)
            {
                var claims = context.User.Claims.ToDictionary(c => c.Type, c => c.Value);
                return Results.Ok(new
                {
                    authenticated = true,
                    user = new
                    {
                        login = claims.GetValueOrDefault(ClaimTypes.NameIdentifier),
                        name = claims.GetValueOrDefault(ClaimTypes.Name),
                        url = claims.GetValueOrDefault("urn:github:url")
                    }
                });
            }
            return Results.Ok(new { authenticated = false });
        });

        app.Run();
    }
}
