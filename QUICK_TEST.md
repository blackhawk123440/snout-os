# Quick System Test

## 1. Login (30 seconds)
- Go to: `https://snout-os-staging.onrender.com/login`
- Email: `leah2maria@gmail.com`
- Password: `Saint214!`
- ✅ Should redirect to dashboard

## 2. Import a Number (1 minute)
- Click "Numbers" in sidebar (or go to `/numbers`)
- Click "Import Number" button
- Enter: `+15551234567` (or any valid number)
- Select class: `front_desk`
- Click "Import"
- ✅ Should see "Number imported successfully"
- ✅ Number appears in table

## 3. View Messages (30 seconds)
- Click "Messages" in sidebar (or go to `/messages`)
- ✅ Should see threads list (may be empty)
- ✅ No errors in browser console

## 4. Worker Test (1 minute)
- Go to: `/ops/proof`
- ✅ Should see API base URL: `https://snout-os-api.onrender.com`
- Click "Trigger Worker Proof"
- ✅ Within 10 seconds, should see new audit event appear

## 5. Check Network (30 seconds)
- Open DevTools (F12) → Network tab
- Refresh `/messages` page
- Find `messages/threads` request
- ✅ Request URL should be: `snout-os-staging.onrender.com/api/...` (NOT direct to API)
- ✅ Status: 200 OK

---

## ✅ All Tests Pass = System Working

If any step fails, check:
- Browser console for errors
- Render logs: https://dashboard.render.com
- Wait 3-5 minutes after code changes for redeploy
