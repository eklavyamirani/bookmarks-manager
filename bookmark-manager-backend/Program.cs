using BookmarkManager.Services;

namespace bookmark_manager_backend;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Add services to the container.
        builder.Services.AddSingleton<IBookmarkService, MockBookmarkService>();

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
        // Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
        builder.Services.AddOpenApi();

        var app = builder.Build();

        // Configure the HTTP request pipeline - order matters!
        
        // CORS middleware should be one of the first in the pipeline
        app.UseCors();

        // Other middleware
        if (app.Environment.IsDevelopment())
        {
            app.MapOpenApi();
        }

        app.UseRouting();
        
        app.UseHttpsRedirection();
        
        app.UseAuthorization();
        
        app.MapControllers();

        app.Run();
    }
}
