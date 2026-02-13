# Test the System - Step by Step

## ✅ Quick Test (5 minutes)

### 1. Login
- Go to: `https://snout-os-staging.onrender.com/login`
- Email: `leah2maria@gmail.com`
- Password: `Saint214!`
- **Expected:** Redirects to dashboard (home page)

### 2. Import a Number
- Click "Numbers" in sidebar (or go to `/numbers`)
- Click "Import Number" button
- Enter: `+15551234567` (or any valid E.164 number)
- Select class: `front_desk`
- Click "Import"
- **Expected:** 
  - Success message: "Number imported successfully"
  - Number appears in table with status "Active"

### 3. View Messages
- Click "Messages" in sidebar (or go to `/messages`)
- **Expected:**
  - Page loads without errors
  - Threads list displays (may be empty)
  - No 404 or 429 errors in browser console (F12)

### 4. Test Worker
- Go to: `/ops/proof`
- **Expected:**
  - Page shows API base URL: `https://snout-os-api.onrender.com`
  - Table shows endpoint checks
- Click "Trigger Worker Proof" button
- **Expected:**
  - Within 10 seconds, new audit event appears:
    - Event type: `ops.proof.job.processed`
    - Timestamp: Current time
    - Job ID: Present

### 5. Check Network (Optional)
- Open DevTools (F12) → Network tab
- Go to `/messages` and refresh
- Find `messages/threads` request
- **Expected:**
  - Request URL: `snout-os-staging.onrender.com/api/messages/threads`
  - Status: 200 OK
  - Response: `{ threads: [...] }`

---

## ✅ All Tests Pass = System Working!

If any step fails:
1. Check browser console (F12) for errors
2. Wait 3-5 minutes after code changes for Render to redeploy
3. Check Render logs: https://dashboard.render.com

---

## Common Issues

**"Invalid email or password"**
- User might not exist in database
- Check if database was seeded

**429 errors**
- Should be fixed now (rate limit increased, polling disabled)
- If still happening, wait a minute and refresh

**404 errors**
- Should be fixed now (all routes created)
- Check browser console for which endpoint is failing

**"Invalid response format"**
- Should be fixed now (response transformation added)
- If still happening, check which endpoint
