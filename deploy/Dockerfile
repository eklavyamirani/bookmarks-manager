FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build-backend
WORKDIR /src

# Copy and restore backend dependencies
COPY bookmark-manager-backend/*.csproj ./bookmark-manager-backend/
WORKDIR /src/bookmark-manager-backend
RUN dotnet restore

# Copy the rest of the backend source and build
WORKDIR /src
COPY bookmark-manager-backend/ ./bookmark-manager-backend/
WORKDIR /src/bookmark-manager-backend
RUN dotnet publish -c Release -o /app/backend

# Build frontend
FROM node:20 AS build-frontend
WORKDIR /src

# Copy package.json, package-lock.json, and .npmrc first
COPY bookmark-manager-frontend/package*.json ./
COPY bookmark-manager-frontend/.npmrc ./
RUN npm install

# Copy the rest of the frontend source and build
COPY bookmark-manager-frontend/ ./
RUN npm run build

# Final image
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app

# Install Nginx for serving the frontend
RUN apt-get update && apt-get install -y nginx

# Copy backend build artifacts
COPY --from=build-backend /app/backend ./backend

# Copy frontend build artifacts
COPY --from=build-frontend /src/build /var/www/html

# Copy Nginx configuration
COPY deploy/nginx.conf /etc/nginx/sites-available/default

# Expose ports
EXPOSE 80 5000

# Set environment variables
ENV ASPNETCORE_URLS=http://+:5000
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=postgres
ENV POSTGRES_DB=bookmarks
ENV UsePostgres=true
ENV GITHUB_CLIENT_ID=placeholder_client_id
ENV GITHUB_CLIENT_SECRET=placeholder_client_secret

# Start both services
COPY deploy/start.sh ./
RUN chmod +x ./start.sh
CMD ["/app/start.sh"]