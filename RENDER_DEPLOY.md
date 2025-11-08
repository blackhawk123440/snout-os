# Deploy to Render - No Code Required 🚀

This guide will help you deploy Snout OS to Render in minutes without touching any code.

## Prerequisites

- GitHub account with this repository
- Render account (free at [render.com](https://render.com))
- OpenPhone account with API key
- Stripe account with API keys (optional, for payments)

## Step 1: Prepare Your Environment Variables

Before deploying, gather these values:

### Required
- **OPENPHONE_API_KEY**: Your OpenPhone API key
- **OPENPHONE_NUMBER_ID**: Your OpenPhone number ID
- **OWNER_PERSONAL_PHONE**: Your personal phone number (e.g., +12025551234)
- **OWNER_OPENPHONE_PHONE**: Your OpenPhone number (e.g., +12025551234)

### Optional (for payments)
- **STRIPE_SECRET_KEY**: Your Stripe secret key (starts with sk_live_)
- **STRIPE_PUBLISHABLE_KEY**: Your Stripe publishable key (starts with pk_live_)

## Step 2: Deploy to Render

### Option A: One-Click Deploy (Easiest)

1. Push this code to GitHub
2. Go to [https://dashboard.render.com/](https://dashboard.render.com/)
3. Click "New +" → "Blueprint"
4. Connect your GitHub repository
5. Render will automatically detect `render.yaml`
6. Click "Apply"
7. Wait for deployment to complete (~5 minutes)

### Option B: Manual Deploy

1. Go to [https://dashboard.render.com/](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: snout-os
   - **Region**: Oregon (or your preferred region)
   - **Branch**: main
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run db:push && npm run build`
   - **Start Command**: `npm run start`
   - **Plan**: Starter ($7/month) or Free

5. Add a PostgreSQL database:
   - Click "New +" → "PostgreSQL"
   - **Name**: snout-os-db
   - **Database Name**: snoutos
   - **Plan**: Starter ($7/month) or Free
   - Click "Create Database"

6. Link database to web service:
   - Go to your web service
   - Click "Environment"
   - Add: `DATABASE_URL` = (copy from database "Internal Database URL")

## Step 3: Add Environment Variables

In your web service dashboard, go to "Environment" and add:

### Required Variables

```
OPENPHONE_API_KEY=your_actual_api_key_here
OPENPHONE_NUMBER_ID=your_actual_number_id_here
OWNER_PERSONAL_PHONE=+12025551234
OWNER_OPENPHONE_PHONE=+12025551234
NODE_ENV=production
```

### Optional Variables (for full functionality)

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Auto-Generated (Render does this automatically)

```
DATABASE_URL=postgresql://... (from database)
NEXTAUTH_SECRET=auto-generated
NEXTAUTH_URL=https://snout-os.onrender.com
```

## Step 4: Verify Deployment

1. **Wait for deployment** (~5 minutes for first deploy)
2. **Check health endpoint**: Visit `https://your-app.onrender.com/api/health`
3. **Test the dashboard**: Visit `https://your-app.onrender.com`

### Health Check URLs

- General health: `https://your-app.onrender.com/api/health`
- OpenPhone status: `https://your-app.onrender.com/api/integrations/openphone/health`
- Database status: `https://your-app.onrender.com/api/integrations/test/database`
- Stripe status: `https://your-app.onrender.com/api/integrations/test/stripe`

## Step 5: Configure Your Application

1. Go to `https://your-app.onrender.com/settings`
2. Verify all integrations show as "Connected"
3. Go to `https://your-app.onrender.com/automation`
4. Configure your automation preferences
5. Set up message templates

## Step 6: Set Up Public Booking Form

Your public booking form is available at:
```
https://your-app.onrender.com/booking-form.html
```

Share this URL with your clients for bookings!

## Troubleshooting

### Deployment Fails

**Issue**: Build fails with "DATABASE_URL not found"
**Solution**: Make sure you created the database and linked it

**Issue**: Health check fails
**Solution**: Check logs in Render dashboard for specific errors

### OpenPhone Not Working

**Issue**: SMS not sending
**Solution**: 
1. Verify `OPENPHONE_API_KEY` is correct
2. Check `OPENPHONE_NUMBER_ID` matches your OpenPhone number
3. Test at `/api/integrations/openphone/health`

### Stripe Not Working

**Issue**: Payment links fail
**Solution**:
1. Verify Stripe keys are correct
2. Make sure keys match (both live or both test)
3. Test at `/api/integrations/test/stripe`

## Viewing Logs

1. Go to your service in Render dashboard
2. Click "Logs" tab
3. View real-time logs for debugging

## Automatic Deployments

Once set up, Render will automatically:
- Deploy when you push to GitHub
- Run database migrations
- Rebuild the application
- Restart services

## Custom Domain (Optional)

1. In Render dashboard, go to "Settings"
2. Scroll to "Custom Domain"
3. Click "Add Custom Domain"
4. Follow DNS configuration instructions
5. SSL certificate is automatic!

## Scaling

### If you need more performance:

1. Upgrade database plan for more connections
2. Upgrade web service plan for more resources
3. Enable Redis for background jobs (optional)

### To add Redis (optional):

1. Click "New +" → "Redis"
2. Create Redis instance
3. Copy "Internal Redis URL"
4. Add to web service: `REDIS_URL=redis://...`

## Cost Estimate

### Minimum (Free Tier)
- Web Service: Free (spins down after inactivity)
- Database: Free (limited connections)
- **Total**: $0/month

### Recommended (Starter Tier)
- Web Service: $7/month (always running)
- Database: $7/month (better performance)
- **Total**: $14/month

### Production (Professional Tier)
- Web Service: $25/month (dedicated resources)
- Database: $25/month (high availability)
- Redis: $10/month (background jobs)
- **Total**: $60/month

## Post-Deployment Checklist

- [ ] Dashboard loads correctly
- [ ] Can create test booking
- [ ] Can assign sitter to booking
- [ ] SMS messages send successfully
- [ ] Payment links generate (if Stripe configured)
- [ ] Calendar view works
- [ ] Public booking form accessible
- [ ] Health checks pass
- [ ] Automations configured
- [ ] Custom domain configured (if desired)

## Support

### Check Application Status
- Dashboard: `https://your-app.onrender.com`
- Health: `https://your-app.onrender.com/api/health`
- Logs: Render Dashboard → Your Service → Logs

### Common Issues
- **Slow first load**: Free tier spins down after 15 min inactivity
- **Database connection errors**: Check DATABASE_URL is set correctly
- **Build failures**: Check logs for specific error messages

## Backup Your Data

Render Pro plans include automatic backups. For Free/Starter:

1. Go to database in Render dashboard
2. Use provided connection string with `pg_dump`
3. Or export data via Prisma Studio: `npm run db:studio`

## Updating Your Application

1. Make changes to code locally
2. Commit and push to GitHub
3. Render automatically deploys
4. Monitor deployment in dashboard

## Need Help?

- Check Render dashboard logs
- Review health check endpoints
- Test individual integrations
- Verify all environment variables are set

---

## Quick Reference

| Service | URL |
|---------|-----|
| Dashboard | `https://your-app.onrender.com` |
| Booking Form | `https://your-app.onrender.com/booking-form.html` |
| API Health | `https://your-app.onrender.com/api/health` |
| Settings | `https://your-app.onrender.com/settings` |
| Automations | `https://your-app.onrender.com/automation` |

---

**🎉 You're all set! Your pet services dashboard is now live on Render!**

