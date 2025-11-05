#!/bin/bash

echo "🚀 GitHub & Render Deployment Setup"
echo ""
echo "This script will help you connect to GitHub and prepare for Render deployment."
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git not initialized. Run 'git init' first."
    exit 1
fi

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📌 Current branch: $CURRENT_BRANCH"
echo ""

# Check if remote exists
if git remote -v | grep -q "origin"; then
    echo "✅ GitHub remote already configured:"
    git remote -v
    echo ""
    read -p "Do you want to change the remote URL? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter your GitHub repository URL: " GITHUB_URL
        git remote set-url origin "$GITHUB_URL"
        echo "✅ Remote URL updated"
    fi
else
    echo "📝 No GitHub remote configured."
    read -p "Enter your GitHub repository URL (or press Enter to skip): " GITHUB_URL
    if [ ! -z "$GITHUB_URL" ]; then
        git remote add origin "$GITHUB_URL"
        echo "✅ GitHub remote added"
    else
        echo "⚠️  Skipping GitHub remote setup. You can add it later with:"
        echo "   git remote add origin <your-repo-url>"
    fi
fi

echo ""
echo "📦 Checking repository status..."
echo ""

# Show uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  You have uncommitted changes:"
    git status --short | head -10
    echo ""
    read -p "Do you want to commit these changes? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        git commit -m "Prepare for Render deployment"
        echo "✅ Changes committed"
    fi
else
    echo "✅ No uncommitted changes"
fi

echo ""
echo "📋 Pre-deployment Checklist:"
echo "  ✓ Build test: npm run build"
echo "  ✓ TypeScript check: npx tsc --noEmit"
echo "  ✓ render.yaml configured"
echo "  ✓ CORS enabled for Webflow"
echo "  ✓ Environment variables documented (see ENV_SETUP.md)"
echo ""

# Push to GitHub if remote exists
if git remote -v | grep -q "origin"; then
    echo "🚀 Ready to push to GitHub!"
    read -p "Do you want to push to GitHub now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git push -u origin "$CURRENT_BRANCH"
        echo ""
        echo "✅ Pushed to GitHub!"
        echo ""
        echo "📝 Next Steps for Render:"
        echo "  1. Go to https://render.com"
        echo "  2. Create a new Web Service"
        echo "  3. Connect your GitHub repository"
        echo "  4. Render will detect render.yaml automatically"
        echo "  5. Add environment variables from ENV_SETUP.md"
        echo "  6. Deploy!"
    fi
else
    echo "⚠️  GitHub remote not configured. Set it up first, then push."
fi

echo ""
echo "✅ Setup complete!"

