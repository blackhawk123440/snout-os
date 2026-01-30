# Quick Demo Guide - What to Show

**Server:** http://localhost:3000

---

## 🎯 Demo Flow (5 minutes)

### 1. Login Page (First Visit)
**URL:** http://localhost:3000

**What to Show:**
- Login form appears automatically if not logged in
- Enter credentials: `owner@example.com` / `password123` (or your credentials)
- Click "Sign in"

**Expected:** Redirects to dashboard

---

### 2. Build Badge (Owner-Only)
**After Login:** Look at bottom-right corner

**What to Show:**
- Small black badge: `Build: <sha> | <timestamp>`
- Only visible to owners
- Proves which commit is running

---

### 3. Messages Page with Diagnostics
**URL:** http://localhost:3000/messages

**What to Show:**
- **Left sidebar:** Click "Messages"
- **Bottom-right corner:** "Ops / Diagnostics" card
- **Click "Show"** to expand diagnostics panel

**Diagnostics Panel Shows:**
1. **Feature Flag:** `NEXT_PUBLIC_ENABLE_MESSAGING_V1 = true` (green)
2. **API Base URL:** (empty/relative - using same origin)
3. **User:** Your email and role
4. **Last Fetch:**
   - URL: `/api/messages/threads`
   - Status: **200** (green) = Working! ✅
   - Size: Response size in bytes
5. **Threads:** Number found (may be 0 if DB empty)

**If Status is 200:**
- ✅ API route is working
- ✅ Authentication is working
- ✅ Feature flag is enabled

**If Status is not 200:**
- Check error message in diagnostics
- See troubleshooting section below

---

### 4. Messaging Inbox UI (If Enabled)
**On `/messages` page:**

**What to Show:**
- **Left side:** Thread list (may be empty)
- **Right side:** Message view (when thread selected)
- **Top:** Search box, filters (Unread, Policy Issues, Delivery Failures)
- **Compose box:** Thread-bound only (at bottom of message view)

**If Empty:**
- Shows "No threads yet" message
- "Create Demo Data" button (if dev mode)
- Click it to seed database

---

### 5. Sitter Deep-Link
**URL:** http://localhost:3000/sitters/<any-sitter-id>

**What to Show:**
1. Navigate to any sitter page
2. Scroll to **"Messaging"** section
3. Shows:
   - Status: Active/Inactive
   - Business Number: (masked number)
   - Active Windows: Count
4. Click **"Open Inbox"** button
5. Should navigate to `/messages?sitterId=<id>`
6. Thread list filters to that sitter's threads

---

### 6. Feature Flag Toggle Test
**On `/messages` page:**

**What to Show:**
- **Top-right:** "Messaging: ON" badge (owner-only)
- If you change flag to `false`:
  - Badge changes to "Messaging: OFF" (red)
  - Shows "Messaging is disabled" message
  - **Diagnostics panel still visible** (this is the fix!)

---

## 🎬 Demo Script

### Opening Statement
"Let me show you the new messaging features and diagnostics tools we've built."

### Step 1: Login
1. Go to http://localhost:3000
2. "Notice the login page appears automatically if you're not logged in."
3. Log in with owner credentials

### Step 2: Build Badge
1. "Look at the bottom-right corner - you'll see a build badge showing the commit SHA and build time."
2. "This proves which version is deployed."

### Step 3: Messages Page
1. Click "Messages" in sidebar
2. "This is the new messaging inbox UI."
3. "Notice the diagnostics panel in the bottom-right corner."

### Step 4: Diagnostics Panel
1. Click "Show" on diagnostics panel
2. "This panel shows exactly why things work or don't work:"
   - "Feature flag status"
   - "API base URL being used"
   - "Your user info from the API"
   - "Last API request details"
   - "Thread count"
3. "If there's an error, it tells you exactly what's wrong:"
   - "401 = Auth issue"
   - "404 = Route missing"
   - "500 = Server error"
   - "0 threads = DB empty"

### Step 5: Sitter Integration
1. Navigate to a sitter page
2. "Here's the messaging section on the sitter profile."
3. Click "Open Inbox"
4. "This deep-links to the messages page with the sitter filter applied."

### Step 6: Error Handling
1. "If something breaks, the diagnostics panel shows the exact cause."
2. "No more guessing - you can see exactly what's wrong."

---

## ✅ Success Indicators

**Everything Working:**
- ✅ Build badge visible (bottom-right)
- ✅ Diagnostics panel shows status 200
- ✅ Feature flag = `true` (green)
- ✅ Threads load (or shows "0 found" if DB empty)
- ✅ Sitter deep-link works

**If Something's Wrong:**
- Diagnostics panel shows exact error
- Error message tells you what to fix
- No silent failures

---

## 🐛 Quick Troubleshooting

### "Status 404"
- **Cause:** Route doesn't exist
- **Fix:** Check that route file exists: `src/app/api/messages/threads/route.ts`

### "Status 401"
- **Cause:** Not authenticated
- **Fix:** Log out and log back in

### "Status 500"
- **Cause:** Server error
- **Fix:** Check server logs for details

### "0 threads, Status 200"
- **Cause:** Database is empty
- **Fix:** Click "Create Demo Data" or run seed script

---

## 📸 What to Screenshot

1. **Build badge** (bottom-right corner)
2. **Diagnostics panel expanded** (showing all fields)
3. **Messages page** with threads (if any)
4. **Sitter page** with messaging section
5. **Sitter deep-link** (URL shows `?sitterId=...`)

---

## 🎯 Key Points to Emphasize

1. **Diagnostics panel is always visible** (even when messaging disabled)
2. **Error messages are specific** (not generic)
3. **Build badge proves deployment** (which commit is running)
4. **Sitter deep-link works** (navigation + filtering)
5. **Feature flag is visible** (ON/OFF badge)

---

## 💡 Pro Tips for Demo

1. **Keep diagnostics panel open** while navigating
2. **Show error scenarios** (if possible) to demonstrate error handling
3. **Show empty state** to demonstrate "Create Demo Data" button
4. **Show sitter deep-link** to demonstrate integration
5. **Show build badge** to prove deployment verification

---

**Ready to demo!** 🚀
