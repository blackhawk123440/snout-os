# Control Surface Preview - Setup Guide

## Quick Start (3 Steps)

### Step 1: Navigate to Project Directory
```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
```

### Step 2: Start Development Server
```bash
npm run dev
```

You should see output like:
```
✓ Ready in 2.5s
○ Local:        http://localhost:3000
```

### Step 3: Open Preview in Browser
Navigate to:
```
http://localhost:3000/control-surface-preview
```

## What You'll See

The preview page demonstrates the Control Surface design system:

### 🎨 Visual System
- **Dark Base Foundation** - Deep, restrained background (depth0-depth3)
- **Pink Voltage** - Subtle pink energy flow (not branding)
- **Spatial Depth** - Panels that feel anchored in space
- **Typography** - Restrained, authoritative text hierarchy

### 📦 Components
- **Panel System** - Three depth levels (base, elevated, floating)
- **StatCard** - Dashboard metrics with voltage levels
- **Button System** - Four variants (primary, secondary, tertiary, ghost)
- **Voltage System** - Ambient, edge, and focus states

### 🎯 Design Philosophy
- Calm, intelligent, quietly advanced
- Continuous and time-aware (not event-driven)
- Visual restraint signals authority
- Pink as voltage/energy, not decoration

## Troubleshooting

### Port Already in Use
If port 3000 is busy, Next.js will use the next available port (3001, 3002, etc.). Check the terminal output for the correct URL.

### Module Not Found Errors
If you see import errors, try:
```bash
npm install
```

### TypeScript Errors
The preview has been typechecked and should work. If you see TypeScript errors:
```bash
npm run typecheck
```

## Next Steps After Review

Once you've reviewed the preview:

1. **If approved**: Proceed with full implementation
   - Rebuild AppShell with dark base
   - Convert all pages to control surface system
   - Apply page-specific postures

2. **If adjustments needed**: Refine the design tokens
   - Adjust voltage intensities
   - Modify depth levels
   - Tune typography or spacing

3. **If different direction**: Discuss alternatives

---

**Preview URL:** `/control-surface-preview`  
**Status:** Ready to view  
**Date:** 2024-12-30

