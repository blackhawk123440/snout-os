# Phase 2.2 Setup and Testing Guide

## Prerequisites

1. ✅ Phase 2.2 implementation complete
2. ✅ Dependencies installed (`bcryptjs`)
3. ✅ Database schema includes User, Session, Account models

## Setup Steps

### 1. Set Environment Variables

Add to `.env`:
```bash
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=your-random-secret-here
NEXTAUTH_URL=http://localhost:3000

# Keep this false until testing is complete
ENABLE_AUTH_PROTECTION=false
```

### 2. Create Admin User

```bash
# Create an admin user with password
npx tsx scripts/create-admin-user.ts admin@example.com your-password "Admin User"

# Example:
# npx tsx scripts/create-admin-user.ts admin@snoutservices.com Password123! "Admin User"
```

### 3. Start Dev Server

```bash
npm run dev
```

## Testing Checklist (Flag False - Baseline)

With `ENABLE_AUTH_PROTECTION=false`:

- [ ] Login page loads at `http://localhost:3000/login`
- [ ] Login form displays email and password fields
- [ ] All dashboard pages accessible (no redirects)
- [ ] All API routes accessible
- [ ] Booking form submission works
- [ ] Webhooks accessible

## Testing Checklist (Flag True - Protection Enabled)

**IMPORTANT:** Only enable after creating admin user!

1. Set `ENABLE_AUTH_PROTECTION=true` in `.env`
2. Restart dev server

### Login Flow
- [ ] Navigate to `/settings` → Redirects to `/login?callbackUrl=/settings`
- [ ] Login page shows with callbackUrl in URL
- [ ] Enter invalid credentials → Shows error message
- [ ] Enter valid credentials → Redirects to `/settings` (callbackUrl)
- [ ] Session persists (refresh page, still logged in)

### Protected Routes
- [ ] `/settings` → Requires login
- [ ] `/bookings` → Requires login
- [ ] `/api/bookings` → Requires login (redirects)
- [ ] `/automation` → Requires login

### Public Routes (Must Still Work)
- [ ] `/api/form` → Still accessible (booking form)
- [ ] `/api/webhooks/stripe` → Still accessible
- [ ] `/api/webhooks/sms` → Still accessible
- [ ] `/api/health` → Still accessible
- [ ] `/tip/success` → Still accessible

### Logout Flow
- [ ] Add logout button to a page (or navigate to `/api/auth/logout`)
- [ ] Click logout → Redirects to `/login`
- [ ] Try accessing protected route → Redirects to login again

## Common Issues

### "Invalid email or password" but credentials are correct
- Check password was hashed correctly in database
- Verify user exists: `npx prisma studio` → Check User table
- Try recreating user with script

### "No session" after login
- Check `NEXTAUTH_SECRET` is set
- Check database connection
- Check Session table exists in database
- Check browser cookies are enabled

### Redirect loop
- Verify `NEXTAUTH_URL` matches your actual URL
- Check middleware is not blocking `/api/auth/*` routes
- Verify `/login` is not protected

## Rollback

If anything goes wrong:
1. Set `ENABLE_AUTH_PROTECTION=false` in `.env`
2. Restart server
3. All routes accessible again

## Next Steps

After successful testing:
1. ✅ Document any issues found
2. ✅ Create production admin user(s)
3. ✅ Enable in staging environment first
4. ✅ Enable in production during low-traffic window
5. ✅ Monitor logs for authentication errors

