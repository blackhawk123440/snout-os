#!/bin/bash
# Render Deployment Script - Automatically run by Render
# DO NOT run this locally - Render handles this automatically

set -e

echo "🔧 Starting Render deployment..."

echo "📦 Installing dependencies..."
npm ci --only=production

echo "🔨 Generating Prisma client..."
npx prisma generate

echo "🗄️  Running database migrations..."
npx prisma db push --accept-data-loss || echo "⚠️  Database migration skipped (may need manual run)"

echo "🏗️  Building application..."
npm run build

echo "✅ Deployment complete!"
echo "🚀 Starting application..."

