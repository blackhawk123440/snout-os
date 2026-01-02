# Control Surface Design System - Preview

## Preview Page

A standalone preview page has been created to showcase the new Control Surface design DNA.

**URL:** `/control-surface-preview`

## What's Demonstrated

### 1. Dark Base Foundation
- Four depth levels (depth0-depth3) showing spatial layering
- Dark, restrained background that establishes calm

### 2. Pink Voltage System
- Voltage as energy flow, not branding
- Four levels: none, ambient, edge, focus
- Subtle pink glow indicates system importance

### 3. Spatial Depth System
- Three panel depths: base, elevated, floating
- Each depth has appropriate shadow and elevation
- Panels feel anchored in space, not flat layers

### 4. Observational Posture (Dashboard Example)
- StatCard components in action
- Calm, wide layout
- Stable data presentation
- Gradual emphasis through voltage levels

### 5. Button System
- Four variants: primary, secondary, tertiary, ghost
- Three sizes: sm, md, lg
- Loading and disabled states
- Restrained, purposeful design

### 6. Typography System
- Restrained authority
- Clear hierarchy
- Mono font for technical data
- Appropriate line heights and letter spacing

### 7. Color System
- Base depth swatches
- Neutral text scale (primary → quaternary)
- Status colors (success, warning, error, info)
- All colors shown in context

### 8. Temporal Intelligence Concept
- Time-aware system (not event-driven)
- Continuous state updates
- Motion would feel like breathing, not triggering

## Design Philosophy

This preview embodies the core principles:

- **Dark, restrained base** - Establishes calm authority
- **Pink as voltage** - Energy flow, not branding
- **Spatial depth** - Panels anchored in space
- **Visual restraint** - Signals authority
- **Temporal intelligence** - Continuous, time-aware
- **Observational posture** - Calm, stable, wide

## Next Steps

After reviewing the preview:

1. **If approved**: Proceed with full implementation
   - Rebuild AppShell with dark base
   - Convert all pages to control surface system
   - Apply page-specific postures
   - Add CSS animations for temporal intelligence

2. **If adjustments needed**: Refine tokens and components
   - Adjust voltage intensities
   - Modify depth levels
   - Tune typography scale
   - Refine spacing rhythm

3. **If different direction**: Discuss alternatives
   - Maintain current system
   - Hybrid approach
   - Alternative design direction

## Components Created

- `src/lib/design-tokens-control-surface.ts` - Complete token system
- `src/components/control-surface/Panel.tsx` - Spatial depth foundation
- `src/components/control-surface/StatCard.tsx` - Metric display
- `src/components/control-surface/Button.tsx` - Restrained actions
- `src/app/control-surface-preview/page.tsx` - Preview page

## Running the Preview

```bash
npm run dev
```

Navigate to: `http://localhost:3000/control-surface-preview`

---

**Status**: Preview created, ready for review
**Date**: 2024-12-30

