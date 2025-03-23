# Bookmark Manager v0.1-alpha Release Notes

## Overview

The Bookmark Manager is a full-stack web application that allows users to save, organize, and track web bookmarks. It features a React frontend and .NET backend with PostgreSQL database support.

## Features

- **Bookmark Management**: Add, view, delete, and mark bookmarks as read
- **Dual API Mode**: Switch between mock API and real backend API
- **Responsive UI**: Clean, user-friendly interface for managing bookmarks
- **PostgreSQL Integration**: Persistent storage using PostgreSQL database

## Technical Details

### Frontend
- Built with React 19 and TypeScript
- Clean component architecture with separation of concerns
- API abstraction layer allowing for mock data or real backend

### Backend
- .NET 9.0 Web API
- Entity Framework Core with PostgreSQL support
- RESTful API design
- Configurable to use either mock data or PostgreSQL database

### Deployment
- Docker containerization for easy deployment
- Nginx as reverse proxy for serving frontend and routing API requests
- Environment variable configuration for deployment flexibility

## Installation

### Docker Deployment
```bash
# Clone the repository
git clone https://github.com/eklavyamirani/bookmarks-manager.git

# Navigate to deployment directory
cd bookmarks-manager/deploy

# Configure environment variables
cp .env_sample .env
# Edit .env file with your desired configuration

# Build and run the application
docker compose up --build
```

The application will be available at http://localhost:8080

## Development

A complete development environment is provided via Dev Containers:

1. Open the project in VS Code with the Dev Containers extension
2. Configure PostgreSQL settings in `.devcontainer/.postgres.env`
3. Reopen in container to start development

## Known Issues
- The App.test.tsx will fail and needs updating to match current implementation

## Future Improvements
- User authentication and multi-user support
- Tagging and categorization of bookmarks
- Browser extension for quick bookmark saving

## Commit ID
`cf0ff764c1cb9d4924210858b080d0a915d7b042`
