# ⚡ Quickstart - Deploy in 3 Minutes

## For Render (Recommended - No Code Required)

### 1️⃣ Push to GitHub
```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

### 2️⃣ Deploy on Render
1. Go to https://dashboard.render.com
2. Click **"New"** → **"Blueprint"**
3. Connect your GitHub repository
4. Click **"Apply"**

### 3️⃣ Add API Keys
In Render dashboard → Your service → Environment:
```
OPENPHONE_API_KEY=your_key_here
OPENPHONE_NUMBER_ID=your_number_here
STRIPE_SECRET_KEY=sk_live_... (optional)
STRIPE_PUBLISHABLE_KEY=pk_live_... (optional)
```

### 4️⃣ Initialize Database
In Render dashboard → Your service → Shell:
```bash
npm run db:push
npm run db:seed
```

### ✅ Done!
Your app is live at: `https://snout-os-dashboard.onrender.com`

---

## Alternative: Vercel (For Static Hosting)

### 1️⃣ Install Vercel CLI
```bash
npm i -g vercel
```

### 2️⃣ Deploy
```bash
vercel --prod
```

### 3️⃣ Add Environment Variables
In Vercel dashboard, add all variables from `.env.example`

---

## Alternative: Railway

### 1️⃣ Install Railway CLI
```bash
npm i -g @railway/cli
```

### 2️⃣ Deploy
```bash
railway login
railway init
railway up
```

---

## Need Help?

- **Render**: See [RENDER_SETUP.md](./RENDER_SETUP.md) for detailed guide
- **Full Documentation**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Security**: See [SECURITY.md](./SECURITY.md)

