# Simple Deployment Guide

## Step 1: Create GitHub Repo
1. Go to https://github.com/new
2. Name it: `snout-os`
3. Click "Create repository"
4. Copy the repo URL (looks like: `https://github.com/yourusername/snout-os.git`)

## Step 2: Push to GitHub
Run these commands in your terminal:

```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
git add .
git commit -m "Ready for Render"
git remote add origin YOUR_GITHUB_URL_HERE
git push -u origin main
```

(Replace `YOUR_GITHUB_URL_HERE` with your actual GitHub URL)

## Step 3: Deploy on Render
1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Click "Connect GitHub" → Select your `snout-os` repo
4. Render will auto-detect everything
5. Add these environment variables (click "Environment"):

```
DATABASE_URL=your_postgres_url
OPENPHONE_API_KEY=your_key
OPENPHONE_NUMBER_ID=your_id
STRIPE_SECRET_KEY=your_key
STRIPE_PUBLISHABLE_KEY=your_key
OWNER_PERSONAL_PHONE=your_phone
OWNER_OPENPHONE_PHONE=your_phone
NODE_ENV=production
```

6. Click "Create Web Service"
7. Wait 5 minutes for deployment
8. Done! Your URL will be: `https://snout-os.onrender.com`

## Step 4: Add to Webflow
Once deployed, add this to your Webflow page:

```html
<iframe src="https://snout-os.onrender.com/booking-form.html" style="width:100%; height:800px; border:none;"></iframe>
```

That's it! 🎉

