#!/bin/bash

# Database migration script for local development
# This script sets up the local PostgreSQL database and applies all migrations

set -e

echo "🗄️  Starting PostgreSQL container..."
docker compose up -d postgres

echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 3

echo "🔄 Running database migrations..."
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/factcheck bun run db:migrate

echo "✅ Database migrations completed successfully!"
echo ""
echo "📊 You can now connect to your local database:"
echo "   postgresql://postgres:postgres@localhost:5432/factcheck"
