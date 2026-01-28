# ⚡ Quick Fix for CORS Error

## ✅ What I Fixed

1. **Updated `apps/web/.env.local`** to point to local API:
   ```env
   NEXT_PUBLIC_API_URL="http://localhost:3001"
   ```

2. **The web server should auto-restart** and pick up the new config

## 🔄 Next Steps

### 1. Restart Both Servers

**Stop current servers** (Ctrl+C in terminals running them), then:

```bash
cd enterprise-messaging-dashboard
pnpm dev
```

This starts:
- API on http://localhost:3001
- Web on http://localhost:3000

### 2. Verify API is Running

Open in browser or terminal:
```bash
curl http://localhost:3001/api/ops/health
```

Should return JSON with health status.

### 3. Try Login Again

1. Go to: http://localhost:3000/login
2. Use credentials:
   - Email: `owner@example.com`
   - Password: `password123`

## 🐛 If API Won't Start

### Check for Errors

```bash
cd enterprise-messaging-dashboard/apps/api
pnpm dev
```

Look for error messages in the terminal.

### Common Issues

1. **Port already in use**:
   ```bash
   lsof -i :3001
   # Kill the process or change PORT in .env
   ```

2. **Database connection failed**:
   - Check `DATABASE_URL` in `apps/api/.env`
   - Make sure Render database is accessible

3. **Missing dependencies**:
   ```bash
   cd enterprise-messaging-dashboard
   pnpm install
   ```

4. **Prisma client not generated**:
   ```bash
   cd apps/api
   pnpm prisma generate
   ```

## ✅ Success Indicators

- ✅ API responds at http://localhost:3001/api/ops/health
- ✅ Web shows login page at http://localhost:3000/login
- ✅ Login works without CORS errors
- ✅ Browser network tab shows requests to `localhost:3001`, not Render URL

## 📝 Summary

The issue was that your web app was trying to connect to the **Render API** (`snoutos-messaging-api.onrender.com`) instead of your **local API** (`localhost:3001`).

**Fixed by**: Updating `apps/web/.env.local` to use `http://localhost:3001`

Now restart the servers and try again! 🚀
