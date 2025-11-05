# Deployment Guide

## Pre-Deployment Checklist

### ✅ Code Quality
- [x] TypeScript type checking passes (`npm run typecheck`)
- [x] Build completes successfully (`npm run build`)
- [x] No critical errors in console
- [x] All API routes are functional
- [x] Database schema is up to date

### Environment Variables Required

#### Required (Minimum)
- `DATABASE_URL` - Database connection string
- `OPENPHONE_API_KEY` - OpenPhone API key
- `OPENPHONE_NUMBER_ID` - OpenPhone number ID

#### Recommended
- `STRIPE_SECRET_KEY` - For payment processing
- `STRIPE_PUBLISHABLE_KEY` - For payment links
- `OWNER_PERSONAL_PHONE` - Owner's personal phone number
- `OWNER_OPENPHONE_PHONE` - Owner's OpenPhone number
- `REDIS_URL` - For background job processing (optional)

#### Optional
- `GOOGLE_CLIENT_ID` - For Google Calendar integration
- `GOOGLE_CLIENT_SECRET` - For Google Calendar integration
- `GOOGLE_REDIRECT_URI` - For Google Calendar OAuth

## Deployment Steps

### 1. Prepare Environment
```bash
# Copy environment template
cp .env.example .env.local

# Fill in all required variables
# Edit .env.local with your actual values
```

### 2. Database Setup
```bash
# Push database schema
npm run db:push

# Optional: Seed initial data
npm run db:seed
```

### 3. Build Application
```bash
# Build for production
npm run build

# Verify build output
ls -la .next
```

### 4. Start Production Server
```bash
# Start production server
npm run start
```

### 5. Verify Deployment
- Check health endpoint: `GET /api/health`
- Check OpenPhone integration: `GET /api/integrations/openphone/health`
- Test booking submission flow
- Test payment link generation
- Test SMS sending

## Platform-Specific Deployment

### Vercel
1. Connect GitHub repository
2. Add environment variables in Vercel dashboard
3. Set build command: `npm run build`
4. Set output directory: `.next`
5. Deploy

### Render
1. Create new Web Service
2. Connect GitHub repository
3. Set build command: `npm run build`
4. Set start command: `npm run start`
5. Add environment variables
6. Add PostgreSQL database (if using)
7. Deploy

### Railway
1. Create new project
2. Connect GitHub repository
3. Add PostgreSQL service (if using)
4. Set environment variables
5. Deploy

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
```

## Post-Deployment Checklist

- [ ] Health endpoints respond correctly
- [ ] Database connection is stable
- [ ] OpenPhone integration works
- [ ] Stripe integration works (if configured)
- [ ] SMS messages are sending
- [ ] Booking form submissions work
- [ ] Payment links generate correctly
- [ ] Calendar view loads correctly
- [ ] Mobile responsive design works
- [ ] All automations are configured

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check database is accessible from deployment platform
- Verify database schema is up to date (`npm run db:push`)

### OpenPhone Integration Issues
- Verify `OPENPHONE_API_KEY` is correct
- Verify `OPENPHONE_NUMBER_ID` is correct
- Check API key has proper permissions
- Test with `/api/integrations/openphone/health`

### Build Errors
- Check Node.js version (requires 20+)
- Verify all dependencies are installed
- Check for TypeScript errors
- Review build logs for specific issues

### SMS Not Sending
- Verify OpenPhone credentials
- Check phone number formatting (E.164 format)
- Review automation settings in dashboard
- Check message templates are configured

## Monitoring

### Health Checks
- `/api/health` - General application health
- `/api/integrations/openphone/health` - OpenPhone status
- `/api/integrations/test/stripe` - Stripe status
- `/api/integrations/test/database` - Database status

### Logs
Monitor application logs for:
- API errors
- Database connection issues
- SMS sending failures
- Payment processing errors

## Security Notes

- Never commit `.env.local` or `.env` files
- Use environment variables for all secrets
- Enable HTTPS in production
- Use secure database connections
- Regularly rotate API keys

## Support

For issues or questions:
1. Check application logs
2. Review health check endpoints
3. Verify environment variables
4. Test individual integrations

