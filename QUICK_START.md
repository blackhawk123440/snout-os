# 🚀 Quick Start - Deploy to Render (No Code!)

## ⚡ Fastest Method: One-Click Deploy

### Step 1: Push to GitHub
```bash
git commit -m "🚀 Prepare for production deployment"
git push origin main
```

### Step 2: Deploy to Render
1. Go to [render.com](https://render.com)
2. Sign up/login with GitHub
3. Click "New +" → "Blueprint"
4. Select your repository
5. Render automatically detects `render.yaml`
6. Click "Apply"

### Step 3: Add Your Environment Variables
In the Render dashboard, add these 4 required variables:

```
OPENPHONE_API_KEY = [your OpenPhone API key]
OPENPHONE_NUMBER_ID = [your OpenPhone number ID]
OWNER_PERSONAL_PHONE = +12025551234
OWNER_OPENPHONE_PHONE = +12025551234
```

Optional (for payments):
```
STRIPE_SECRET_KEY = sk_live_...
STRIPE_PUBLISHABLE_KEY = pk_live_...
```

### Step 4: Done! ✅
- Wait 5 minutes for deployment
- Visit your URL: `https://snout-os.onrender.com`
- Test health: `https://snout-os.onrender.com/api/health`

---

## 📚 Need More Details?

See [RENDER_DEPLOY.md](./RENDER_DEPLOY.md) for comprehensive instructions.

## 🎯 What You Get

- ✅ Full dashboard running on Render
- ✅ PostgreSQL database (included)
- ✅ Automatic SSL certificate
- ✅ Auto-deploy from GitHub
- ✅ Health checks
- ✅ Free tier available!

## 💰 Cost

- **Free Tier**: $0/month (spins down after 15 min)
- **Starter**: $14/month (always on)
- **Pro**: $60/month (high performance)

---

**That's it! No code changes needed. Everything is configured in `render.yaml`.**
