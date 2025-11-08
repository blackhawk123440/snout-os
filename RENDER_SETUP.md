# 🚀 Render Deployment Guide - No Code Required

This guide will help you deploy Snout OS to Render in **under 5 minutes** with **zero coding**.

## Prerequisites

1. A GitHub account
2. A Render account (sign up at https://render.com - it's free!)
3. Your API keys ready:
   - OpenPhone API Key
   - OpenPhone Number ID
   - Stripe Secret Key (optional, for payments)
   - Stripe Publishable Key (optional, for payments)

---

## 🎯 One-Click Deployment Steps

### Step 1: Push to GitHub (One Time)

```bash
# Commit your changes
git commit -F COMMIT_MESSAGE.txt

# Push to GitHub
git push origin main
```

### Step 2: Deploy to Render

1. **Go to Render Dashboard**: https://dashboard.render.com

2. **Click "New" → "Blueprint"**

3. **Connect Your GitHub Repository**
   - Click "Connect account" if not already connected
   - Select your `snout-os` repository
   - Click "Connect"

4. **Render Will Automatically:**
   - ✅ Detect the `render.yaml` file
   - ✅ Create a PostgreSQL database
   - ✅ Create the web service
   - ✅ Set up environment variables
   - ✅ Build and deploy your app

### Step 3: Add Your API Keys (Required)

After the blueprint is created, you need to add your API keys:

1. **Go to your service** in the Render dashboard
2. **Click "Environment"** in the left sidebar
3. **Add these required variables**:

   ```
   OPENPHONE_API_KEY=your_actual_api_key_here
   OPENPHONE_NUMBER_ID=your_actual_number_id_here
   ```

4. **Optional but recommended**:
   ```
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   OWNER_PERSONAL_PHONE=+1234567890
   OWNER_OPENPHONE_PHONE=+1234567890
   ```

5. **Click "Save Changes"** - This will trigger an automatic redeploy

### Step 4: Initialize Database

Once deployed, run the database setup:

1. **Go to your service** in Render dashboard
2. **Click "Shell"** at the top right
3. **Run these commands**:
   ```bash
   npm run db:push
   npm run db:seed
   ```

---

## ✅ Verify Deployment

After deployment completes (5-10 minutes):

1. **Open your app**: Click the URL at the top (e.g., `https://snout-os-dashboard.onrender.com`)

2. **Check health endpoint**: 
   - Go to: `https://your-app.onrender.com/api/health`
   - Should see: `{"status": "ok"}`

3. **Test integrations**:
   - OpenPhone: `/api/integrations/openphone/health`
   - Stripe: `/api/integrations/test/stripe`
   - Database: `/api/integrations/test/database`

---

## 🎨 Custom Domain (Optional)

1. In Render dashboard, click your service
2. Go to "Settings"
3. Scroll to "Custom Domain"
4. Add your domain (e.g., `dashboard.snoutservices.com`)
5. Update your DNS records as shown
6. Update `NEXTAUTH_URL` environment variable to your custom domain

---

## 🔄 Automatic Updates

**Render will automatically:**
- Deploy when you push to `main` branch
- Run database migrations
- Restart if the app crashes
- Scale based on traffic

**To deploy updates:**
```bash
git add .
git commit -m "Your update message"
git push origin main
```

That's it! Render handles the rest.

---

## 📊 Monitoring & Logs

### View Logs
1. Go to your service in Render
2. Click "Logs" tab
3. See real-time application logs

### Monitor Performance
1. Click "Metrics" tab
2. View:
   - CPU usage
   - Memory usage
   - Request rate
   - Response times

### Set Up Alerts
1. Click "Settings"
2. Scroll to "Notifications"
3. Add email/Slack for alerts

---

## 💰 Pricing

**Starter Plan (Free tier available):**
- Web Service: $7/month (or free with limitations)
- PostgreSQL: $7/month (or free with limitations)
- **Total: $14/month** (or free for testing)

**Free Tier Limitations:**
- Services spin down after 15 minutes of inactivity
- 750 hours/month free (good for testing)
- Upgrade anytime for 24/7 uptime

---

## 🆘 Troubleshooting

### Build Fails
**Problem**: Build fails with "Module not found"  
**Solution**: 
```bash
# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json
npm install
git add package-lock.json
git commit -m "Update dependencies"
git push
```

### Database Connection Error
**Problem**: "Can't reach database"  
**Solution**: Wait 2-3 minutes for database to fully start, then manually trigger redeploy

### OpenPhone Not Working
**Problem**: SMS messages not sending  
**Solution**: 
1. Verify `OPENPHONE_API_KEY` is correct
2. Verify `OPENPHONE_NUMBER_ID` is correct
3. Check logs for detailed error messages
4. Test at: `/api/integrations/openphone/health`

### App Not Loading
**Problem**: "Service Unavailable"  
**Solution**: Check logs for specific error, common issues:
- Missing required environment variables
- Database not initialized (`npm run db:push`)
- Build errors (check build logs)

---

## 🔒 Security Checklist

After deployment:
- [ ] All environment variables are set
- [ ] Database is initialized
- [ ] Health checks return 200
- [ ] Webhook URLs updated (if using webhooks)
- [ ] Custom domain configured (if applicable)
- [ ] Backups enabled (in database settings)
- [ ] Notifications set up

---

## 📞 Support

- **Render Docs**: https://render.com/docs
- **Render Status**: https://status.render.com
- **Render Community**: https://community.render.com

---

## 🎉 You're Done!

Your Snout OS dashboard is now live and automatically updating with every push to GitHub!

**Next Steps:**
1. Test the booking form: `https://your-app.onrender.com/booking-form.html`
2. Configure automations in the dashboard
3. Add sitters and start managing bookings
4. Set up payment links in Stripe

**Need help?** Check the main README.md and DEPLOYMENT.md for more details.

