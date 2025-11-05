# Environment Variables for Render Deployment

Copy these variables to your Render dashboard:

## Required Variables

```
DATABASE_URL=postgresql://user:password@host:5432/dbname
OPENPHONE_API_KEY=your_openphone_api_key
OPENPHONE_NUMBER_ID=your_openphone_number_id
STRIPE_SECRET_KEY=sk_live_or_test_key
STRIPE_PUBLISHABLE_KEY=pk_live_or_test_key
OWNER_PERSONAL_PHONE=+1234567890
OWNER_OPENPHONE_PHONE=+1234567890
NODE_ENV=production
```

## Optional Variables

```
REDIS_URL=redis://host:port
NEXT_PUBLIC_APP_URL=https://your-app-name.onrender.com
NEXT_PUBLIC_BASE_URL=https://your-app-name.onrender.com
```

## After Deployment

1. Set NEXT_PUBLIC_APP_URL to your Render URL
2. Set NEXT_PUBLIC_BASE_URL to your Render URL
3. Use these URLs in your Webflow embed code
