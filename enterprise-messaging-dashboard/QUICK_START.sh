#!/bin/bash

# Quick Start Script for Enterprise Messaging Dashboard
# Run this from the enterprise-messaging-dashboard directory

set -e  # Exit on error

echo "🚀 Starting Enterprise Messaging Dashboard Setup..."

# Check for pnpm
if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm
fi

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop first."
    echo "   Download from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Start Docker services
echo "🐳 Starting Docker services (Postgres + Redis)..."
if command -v docker-compose &> /dev/null; then
    docker-compose up -d
else
    docker compose up -d
fi

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# Setup database
echo "🗄️  Setting up database..."
cd apps/api

echo "  → Generating Prisma client..."
pnpm prisma generate

echo "  → Running migrations..."
pnpm prisma migrate dev

echo "  → Seeding database..."
pnpm db:seed

# Go back to root
cd ../..

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 Starting development servers..."
echo "   API: http://localhost:3001"
echo "   Web: http://localhost:3000"
echo ""
echo "📝 Demo credentials:"
echo "   Email: owner@example.com"
echo "   Password: password123"
echo ""
echo "Press Ctrl+C to stop servers"
echo ""

# Start both servers
pnpm dev
