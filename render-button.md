# 🚀 One-Click Deploy to Render

Click the button below to deploy Snout OS to Render with zero configuration:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/YOUR_USERNAME/snout-os)

> **Note**: Replace `YOUR_USERNAME` with your actual GitHub username in the URL above

## What This Does

Clicking the button will:
1. ✅ Create a new Render account (if you don't have one)
2. ✅ Fork or connect your repository
3. ✅ Create a PostgreSQL database
4. ✅ Deploy the web service
5. ✅ Set up environment variables (you'll add your API keys)
6. ✅ Automatically deploy on every push to main

## After Clicking Deploy

You'll need to add these environment variables in the Render dashboard:

**Required:**
- `OPENPHONE_API_KEY` - Your OpenPhone API key
- `OPENPHONE_NUMBER_ID` - Your OpenPhone number ID

**Optional but Recommended:**
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key
- `OWNER_PERSONAL_PHONE` - Owner's personal phone
- `OWNER_OPENPHONE_PHONE` - Owner's OpenPhone number

## Initialize Your Database

After deployment:
1. Go to your service in Render
2. Click "Shell" at the top
3. Run:
   ```bash
   npm run db:push
   npm run db:seed
   ```

## That's It!

Your dashboard will be live at: `https://snout-os-dashboard.onrender.com`

For detailed setup instructions, see [RENDER_SETUP.md](./RENDER_SETUP.md)
































