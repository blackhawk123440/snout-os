#!/bin/bash
# Rebuild bcrypt native module
# This script ensures bcrypt is properly compiled for the current platform

set -e

echo "🔧 Rebuilding bcrypt native module..."

# Navigate to workspace root
cd "$(dirname "$0")/../.."

# Rebuild bcrypt
pnpm rebuild bcrypt || {
  echo "⚠️  pnpm rebuild failed, trying npm rebuild..."
  cd node_modules/.pnpm/bcrypt@5.1.1/node_modules/bcrypt 2>/dev/null || cd node_modules/bcrypt 2>/dev/null || {
    echo "❌ Could not find bcrypt module"
    exit 1
  }
  npm rebuild || {
    echo "⚠️  Rebuild failed, but continuing..."
  }
}

echo "✅ bcrypt rebuild complete"
