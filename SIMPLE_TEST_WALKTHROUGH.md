# Simple Feature Testing Walkthrough

**Server:** http://localhost:3000  
**Goal:** Test each feature step-by-step

---

## 🚀 Step 1: Open the App

1. Open your browser
2. Go to: **http://localhost:3000**
3. Log in (if not already logged in)
   - Use owner credentials to see all features

**✅ Check:** You should see the dashboard

---

## 🏷️ Step 2: Test Build Badge

**What:** Small badge showing build info (owner-only)

1. Look at the **bottom-right corner** of the page
2. You should see a small black badge

**✅ Expected:** 
- Badge says: `Build: <some-letters> | <date-time>`
- Only visible if you're logged in as owner

**❌ If missing:**
- Make sure you're logged in as owner (not sitter)
- Check browser console for errors

---

## 📊 Step 3: Test Diagnostics Panel

**What:** Panel that shows why things work/don't work

1. Click on **"Messages"** in the left sidebar (or go to http://localhost:3000/messages)
2. Look at the **bottom-right corner** for a card that says **"Ops / Diagnostics"**
3. Click the **"Show"** button to expand it

**✅ Expected:**
- Panel appears (owner-only)
- Shows:
  - **Feature Flag:** `NEXT_PUBLIC_ENABLE_MESSAGING_V1 = true` (or false)
  - **API Base URL:** `http://localhost:3001` (or your API URL)
  - **User:** Your email and role
  - **Last Fetch:** URL, status code, response size
  - **Threads:** Number of threads found

**❌ If missing:**
- Make sure you're logged in as owner
- Check that you're on `/messages` page

---

## 🔧 Step 4: Test Feature Flag Display

**What:** See if messaging is enabled or disabled

1. On `/messages` page, expand the diagnostics panel (Step 3)
2. Look at the **"Feature Flag"** section

**✅ Expected:**
- Shows: `NEXT_PUBLIC_ENABLE_MESSAGING_V1 = true` (green) OR `false` (red)
- If `true`: You should see the messaging inbox UI
- If `false`: You should see "Messaging is disabled" message

**💡 Tip:** Even if disabled, diagnostics panel should still be visible!

---

## 🔌 Step 5: Test API Connectivity

**What:** See if the app can talk to the API

1. On `/messages` page, expand diagnostics panel
2. Look at the **"Last Fetch"** section

**✅ Expected (API Running):**
- **Status:** `200` (green badge)
- **URL:** Shows the API endpoint
- **Size:** Shows response size in bytes

**❌ Expected (API Not Running):**
- **Status:** `404` or network error (red badge)
- **Error message:** "Wrong API base URL or route not deployed"

**💡 What this tells you:**
- `200` = API is working ✅
- `404` = API route doesn't exist ❌
- `401/403` = Not logged in to API ❌
- `500+` = API server error ❌

---

## 👤 Step 6: Test User Info Display

**What:** See your logged-in user info

1. On `/messages` page, expand diagnostics panel
2. Look at the **"User (from /api/auth/me)"** section

**✅ Expected:**
- Shows your email address
- Shows your role: `(owner)` or `(sitter)`

**❌ If wrong:**
- Check that you're logged in
- Try logging out and back in

---

## 🔗 Step 7: Test Sitter Deep-Link

**What:** Navigate from sitter page to filtered messages

1. Go to any sitter page: **http://localhost:3000/sitters/<any-sitter-id>**
   - (Replace `<any-sitter-id>` with an actual sitter ID from your database)
2. Scroll down to find the **"Messaging"** section
3. Click the **"Open Inbox"** button

**✅ Expected:**
- URL changes to: `/messages?sitterId=<sitter-id>`
- If threads exist: Shows only threads for that sitter
- If no threads: Shows "No active conversations for this sitter"

**❌ If not working:**
- Check browser console for errors
- Make sure sitter ID is in the URL
- Check diagnostics panel for API errors

---

## 📱 Step 8: Test Messaging Inbox (If Enabled)

**What:** See the full messaging UI

**Prerequisites:** Feature flag must be `true` (from Step 4)

1. On `/messages` page
2. If flag is `true`, you should see:
   - **Left side:** List of conversation threads
   - **Right side:** Message view (when thread selected)
   - **Filters:** Unread, Policy Issues, Delivery Failures buttons
   - **Search box:** At the top

**✅ Expected:**
- Thread list loads (may be empty if no data)
- Can click on threads to see messages
- Can compose messages (thread-bound only)

**❌ If empty:**
- Check diagnostics panel
- If status `200` but 0 threads = Database is empty
- Click "Create Demo Data" button (if visible) or seed the database

---

## 🎯 Step 9: Test Error Messages

**What:** See how errors are displayed

1. On `/messages` page, expand diagnostics panel
2. Look at the error section (if any errors)

**✅ Expected Error Messages:**

| What You See | What It Means |
|--------------|---------------|
| "JWT/auth mismatch" | Not logged in to API |
| "Wrong API base URL" | API URL is wrong or route missing |
| "API down: Server error" | API server crashed |
| "DB empty — seed required" | No data in database |

**💡 Tip:** Each error has a specific message telling you exactly what's wrong!

---

## 📍 Step 10: Test API Base URL Resolution

**What:** See what API URL the app is actually using

1. On `/messages` page, expand diagnostics panel
2. Look at **"API Base URL (resolved)"** section

**✅ Expected:**
- Shows the actual URL used: `http://localhost:3001` (or your staging URL)
- Below it shows the raw env var value

**💡 What this tells you:**
- If URL is wrong, update `NEXT_PUBLIC_API_URL` in `.env.local`
- If URL is correct but still errors, check API server is running

---

## ✅ Quick Success Checklist

After testing, you should have verified:

- [ ] Build badge visible (bottom-right, owner-only)
- [ ] Diagnostics panel visible on `/messages` (owner-only)
- [ ] Feature flag shows correct value
- [ ] API base URL shows correct URL
- [ ] User info shows your email and role
- [ ] Last fetch shows status code (200 = good, 404 = bad)
- [ ] Sitter deep-link navigates correctly
- [ ] Error messages are clear and helpful

---

## 🐛 Common Issues & Quick Fixes

### "Diagnostics panel doesn't show"
- ✅ Make sure you're logged in as **owner** (not sitter)
- ✅ Make sure you're on `/messages` page

### "Build badge doesn't show"
- ✅ Make sure you're logged in as **owner**
- ✅ Check bottom-right corner (might be small)

### "API shows 404 error"
- ✅ Check that API server is running on port 3001
- ✅ Check `NEXT_PUBLIC_API_URL` in `.env.local` matches your API URL

### "Feature flag shows false"
- ✅ Set `NEXT_PUBLIC_ENABLE_MESSAGING_V1=true` in `.env.local`
- ✅ Restart dev server: `pnpm dev`

### "0 threads found"
- ✅ Database is empty - seed it with demo data
- ✅ Click "Create Demo Data" button (if visible) or run seed script

---

## 🎬 Testing Order (Recommended)

1. **Build Badge** (Step 2) - Quick visual check
2. **Diagnostics Panel** (Step 3) - Foundation for all other tests
3. **Feature Flag** (Step 4) - Know if messaging is enabled
4. **API Connectivity** (Step 5) - Know if API is working
5. **User Info** (Step 6) - Verify auth is working
6. **Sitter Deep-Link** (Step 7) - Test navigation
7. **Messaging Inbox** (Step 8) - Test full UI (if enabled)
8. **Error Messages** (Step 9) - Understand what's broken
9. **API URL** (Step 10) - Verify configuration

---

## 💡 Pro Tips

1. **Keep diagnostics panel open** while testing - it shows everything
2. **Check browser console** (F12) for any JavaScript errors
3. **Check Network tab** (F12 → Network) to see API requests
4. **Refresh page** if something doesn't update
5. **Log out and back in** if auth seems broken

---

## 🎯 What Success Looks Like

**Perfect scenario:**
- ✅ Build badge shows in bottom-right
- ✅ Diagnostics panel shows all green checkmarks
- ✅ Feature flag = `true`
- ✅ API status = `200`
- ✅ Threads load successfully
- ✅ Sitter deep-link works
- ✅ No error messages

**If you see this, everything is working! 🎉**
