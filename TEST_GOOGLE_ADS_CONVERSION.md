# Testing Google Ads Conversion Tracking

## Quick Test Steps

### 1. Start Development Server
```bash
cd snout-os
npm run dev
```

### 2. Open Booking Form
Navigate to: `http://localhost:3000/booking-form`

### 3. Open Browser DevTools
- Press `F12` or `Cmd+Option+I` (Mac)
- Go to **Console** tab
- Go to **Network** tab (filter by "gtag" or "google")

### 4. Complete Test Booking
1. Select a service
2. Select pet type and quantity
3. Select dates
4. Select times
5. Fill in contact information
6. Submit the form

### 5. Verify Conversion Event

**In Console:**
- Look for: `Google Ads conversion event fired`
- Check for any errors

**In Network Tab:**
- Filter by "gtag" or "google"
- Look for request to `www.google-analytics.com` or `www.googletagmanager.com`
- Check request payload includes:
  - `send_to=AW-11558191297/81slCKHb0PEbEMGBsIcr`
  - `event=conversion`

**Verify Double-Fire Protection:**
- Refresh the confirmation page
- Check console - should NOT see "Google Ads conversion event fired" again
- Only one network request should be made

## Testing in Production

### 1. Deploy to Render
The changes are already committed and pushed. Render will auto-deploy.

### 2. Test on Production URL
- Navigate to: `https://your-render-url.onrender.com/booking-form`
- Follow same steps as above

### 3. Test in Webflow Embed
- The form should work when embedded in Webflow
- The Google Ads script loads in the iframe
- Conversion fires when confirmation page is shown

## Expected Behavior

✅ **Should Happen:**
- Google Ads script loads on page load
- Conversion event fires once when step 7 (confirmation) is shown
- Console shows "Google Ads conversion event fired"
- Network request sent to Google Analytics

❌ **Should NOT Happen:**
- Multiple conversion events on same page load
- Conversion event on refresh (double-firing protection)
- Conversion event on intermediate steps
- Errors in console about gtag not being defined

## Troubleshooting

### If conversion doesn't fire:
1. Check console for errors
2. Verify `window.gtag` is defined: `console.log(typeof window.gtag)`
3. Check Network tab for script loading errors
4. Verify you're on step 7 (confirmation page)

### If double-firing occurs:
1. Check that `googleAdsConversionFired` flag is set
2. Verify the flag check happens before firing
3. Check console for multiple "Google Ads conversion event fired" messages

## Google Ads Verification

After testing, check Google Ads:
1. Go to Google Ads → Tools & Settings → Conversions
2. Find conversion: "Request quote"
3. Wait 15-30 minutes for data to appear
4. Verify conversion count increased
