#!/bin/bash

# Get PostgreSQL connection details from environment variables
POSTGRES_USER="${POSTGRES_USER}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"
POSTGRES_DB="${POSTGRES_DB}"
POSTGRES_HOST="${POSTGRES_HOST}"

# Create connection string
CONNECTION_STRING="Host=${POSTGRES_HOST};Database=${POSTGRES_DB};Username=${POSTGRES_USER};Password=${POSTGRES_PASSWORD}"

# Output the connection string (without password)
echo "Connecting to PostgreSQL database: Host=${POSTGRES_HOST};Database=${POSTGRES_DB};Username=${POSTGRES_USER}"

# Navigate to the project directory
cd /workspaces/bookmarks-manager/bookmark-manager-backend

# Scaffold models from the database
dotnet ef dbcontext scaffold "$CONNECTION_STRING" Npgsql.EntityFrameworkCore.PostgreSQL \
  --output-dir Models/Generated \
  --context-dir Data \
  --context BookmarksDbContext \
  --force \
  --no-onconfiguring

echo "Database scaffolding completed"
