# Webflow Iframe Resize Code

To make the iframe in Webflow automatically adjust its height based on the form content, add this code to your Webflow page.

## Instructions

1. In Webflow, go to your page settings
2. Add this code to the **Before </body> tag** section (or use a Custom Code embed):

```html
<script>
  (function() {
    // Find the iframe - adjust the selector to match your iframe
    // Option 1: If your iframe has an ID
    const iframe = document.getElementById('booking-form-iframe');
    
    // Option 2: If your iframe has a specific class
    // const iframe = document.querySelector('.booking-form-iframe');
    
    // Option 3: If you want to target any iframe with the booking form URL
    // const iframes = document.querySelectorAll('iframe[src*="booking-form"]');
    // const iframe = iframes[0];
    
    if (!iframe) {
      console.warn('Booking form iframe not found');
      return;
    }
    
    // Set initial height to prevent grey box flash
    iframe.style.height = '1200px'; // Adjust to your initial height
    iframe.style.width = '100%';
    iframe.style.border = 'none';
    iframe.style.transition = 'height 0.3s ease';
    
    // Listen for height updates from the iframe
    window.addEventListener('message', function(event) {
      // Security: Only accept messages from your booking form domain
      const allowedOrigins = [
        'https://backend-291r.onrender.com',
        'https://www.snoutservices.com',
        'https://snoutservices.com',
        'http://localhost:3000',
        'http://localhost:3001'
      ];
      
      // Check if message is from allowed origin
      if (!allowedOrigins.some(origin => event.origin.includes(origin.replace(/^https?:\/\//, '').split('/')[0]))) {
        return; // Ignore messages from other origins
      }
      
      // Check if this is a resize message
      if (event.data && event.data.type === 'iframe-resize' && event.data.height) {
        const newHeight = event.data.height;
        
        // Add a small buffer to prevent scrollbar issues
        const buffer = 20;
        const finalHeight = newHeight + buffer;
        
        // Update iframe height with smooth transition
        iframe.style.height = finalHeight + 'px';
        
        // Optional: Log for debugging (remove in production)
        // console.log('Iframe height updated to:', finalHeight + 'px');
      }
    });
    
    // Fallback: Try to resize on page load
    window.addEventListener('load', function() {
      setTimeout(function() {
        if (iframe.contentWindow) {
          try {
            // Request initial height
            iframe.contentWindow.postMessage({ type: 'request-height' }, '*');
          } catch (e) {
            // Cross-origin restrictions may prevent this
          }
        }
      }, 500);
    });
  })();
</script>
```

## Alternative: Using a Wrapper Div

If you prefer to wrap the iframe in a container that adjusts:

```html
<div id="booking-form-wrapper" style="width: 100%; overflow: hidden;">
  <iframe 
    id="booking-form-iframe"
    src="https://backend-291r.onrender.com/booking-form"
    style="width: 100%; border: none; display: block;"
    allow="clipboard-read; clipboard-write"
    title="Snout Booking Form">
  </iframe>
</div>

<script>
  (function() {
    const iframe = document.getElementById('booking-form-iframe');
    const wrapper = document.getElementById('booking-form-wrapper');
    
    if (!iframe || !wrapper) return;
    
    // Set initial height
    iframe.style.height = '1200px';
    wrapper.style.height = '1200px';
    wrapper.style.transition = 'height 0.3s ease';
    
    window.addEventListener('message', function(event) {
      const allowedOrigins = [
        'https://backend-291r.onrender.com',
        'https://www.snoutservices.com',
        'https://snoutservices.com'
      ];
      
      if (!allowedOrigins.some(origin => event.origin.includes(origin.replace(/^https?:\/\//, '').split('/')[0]))) {
        return;
      }
      
      if (event.data && event.data.type === 'iframe-resize' && event.data.height) {
        const newHeight = event.data.height + 20; // Add buffer
        iframe.style.height = newHeight + 'px';
        wrapper.style.height = newHeight + 'px';
      }
    });
  })();
</script>
```

## Webflow-Specific Instructions

1. **Add Custom Code Embed:**
   - In Webflow Designer, add an **Embed** element
   - Paste the script code above
   - Place it near your iframe element

2. **Update Iframe Selector:**
   - Make sure the `iframe` selector matches your iframe element
   - You can add an ID or class to your iframe in Webflow
   - Update the JavaScript selector accordingly

3. **Test:**
   - Preview your page
   - The iframe should automatically adjust height as you navigate through the form
   - No grey box should appear

## Troubleshooting

- **If the iframe doesn't resize:** Check browser console for errors
- **If you see security warnings:** Make sure the allowed origins match your booking form domain
- **If there's still a grey box:** Increase the initial height value or add `min-height` to the iframe

