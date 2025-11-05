#!/bin/bash

echo "🚀 Quick Deploy Setup"
echo ""

# Step 1: Check if we need to commit
if [ -n "$(git status --porcelain)" ]; then
    echo "📦 Committing changes..."
    git add .
    git commit -m "Ready for Render deployment"
    echo "✅ Committed"
else
    echo "✅ Already committed"
fi

# Step 2: Check for remote
if git remote -v | grep -q "origin"; then
    echo "✅ GitHub remote already set"
    git remote -v
else
    echo ""
    echo "📝 Add your GitHub repository:"
    echo "   git remote add origin YOUR_GITHUB_URL"
    echo ""
    echo "   Then run: git push -u origin main"
    exit 0
fi

# Step 3: Push
echo ""
echo "🚀 Pushing to GitHub..."
git push -u origin main

echo ""
echo "✅ Done! Now go to Render.com and connect your repo."

