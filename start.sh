#!/bin/bash
set -e

echo "Starting services..."

# Start Nginx in the background
echo "Starting Nginx..."
service nginx start

# Wait a moment for Nginx to start
sleep 2

echo "Starting .NET backend application..."
# Start the backend .NET application
cd /app/backend
dotnet bookmark-manager-backend.dll