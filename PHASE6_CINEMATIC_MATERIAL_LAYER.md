# Phase 6: Cinematic Material Layer

**Date:** 2025-01-27  
**Objective:** Upgrade Snout OS from flat enterprise UI to cinematic enterprise interface while preserving all existing system DNA, postures, and governance.

---

## Overview

Phase 6 adds atmosphere, light, and material depth without changing layout, spacing, or behavior. The goal is to create a cinematic, mission-critical interface that feels quiet, powerful, and expensive.

---

## Implementation

### 1. Global Environment Layer

**Dark-to-Neutral Atmospheric Gradient**

Added persistent environment layer behind entire app:

- **Color:** Near-black charcoal to deep violet gray (rgba(40-50, 35-45, 45-60, 0.10-0.16))
- **Saturation:** Very low (subtle violet-gray tones)
- **Falloff:** Very slow (large gradient spreads, 70% transparent zones)
- **Intensity:** 12-16% opacity (within 12-18% target range)
- **Feeling:** Deep space, night lab, control room (not "dark mode")

**Implementation:**
- Three overlapping gradients create subtle atmospheric depth
- No visible banding (smooth transitions)
- Pink tint exists but extremely subtle (only in light fields, not background)

### 2. Volumetric Light Field

**Two Large, Soft Radial Light Sources**

Added volumetric light fields for glass to refract:

- **Primary light:** Center-left (25% 45%), pink tint at 0.08 opacity
- **Secondary light:** Lower-right (75% 85%), pink tint at 0.06 opacity
- **Blur:** 60px filter blur for extremely soft, diffused light
- **Radii:** Large elliptical spreads (80-100% viewport)
- **Falloff:** 60-65% transparent zones

**Rules:**
- Pink #fce1ef used ONLY as tint, never as solid color
- Lights exist only to be refracted by glass
- Never look like gradients (large spreads, heavy blur)
- Extremely subtle (0.06-0.08 opacity)

### 3. Glass Material Rewrite

**Physical, Thick, Milky Glass**

Completely rewrote glass material for cinematic appearance:

**Background Opacity:**
- Sidebar: `rgba(255, 255, 255, 0.64)` (0.55-0.72 range)
- Cards: `rgba(255, 255, 255, 0.68)` (slightly more opaque)

**Backdrop Filter:**
- Blur: 24px (18-30px range)
- Saturate: 135% (120-140% range)

**Visual Properties:**
- **Internal light falloff:** `inset 0 2px 8px 0 rgba(255, 255, 255, 0.30)`
- **Inner glow at top edge:** `inset 0 1px 0 0 rgba(255, 255, 255, 0.50)`
- **Inner shadow for depth:** `inset 0 4px 12px 0 rgba(0, 0, 0, 0.06)`
- **Shadow below glass:** `0 6px 12px -2px rgba(0, 0, 0, 0.08)`
- **Subtle top edge pink tint:** `inset 0 1px 0 0 rgba(252, 225, 239, 0.12)`

**Result:** Glass looks milky, thick, and physical - like a physical slab, not a UI panel.

### 4. Light Emission (Static Only)

**Soft Glow Behind Primary Actions**

Added static light emission to primary buttons:

- **Trigger:** Focused/active energy states only
- **Style:** Soft pink glow (0.25 outer, 0.15 inner opacity)
- **Inner highlight:** Subtle white highlight on top edge
- **No animation:** Static only, no pulsing or looping
- **Presence, not animation:** Adds presence without motion

**Implementation:**
```css
boxShadow: energy === 'active' || energy === 'focused'
  ? `0 0 16px 0 rgba(252, 225, 239, 0.25), 0 0 8px 0 rgba(252, 225, 239, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.30)`
  : 'none'
```

**Rules:**
- No pulsing
- No looping
- No "neon" appearance
- Gentle color bloom only

### 5. Noise and Grain

**Global Micro-Noise Layer**

Added essential noise layer for glass realism:

- **Frequency:** Higher frequency (baseFrequency 3.0, 4 octaves)
- **Opacity:** 0.035 (0.02-0.05 range)
- **Position:** Above background, below UI (z-index: 0)
- **Blend mode:** Overlay for integration

**Why Essential:** Without noise, glass will always look fake. Noise adds physical texture that glass refracts.

### 6. Enterprise Restraint Guardrails

**Explicitly Forbidden:**
- ✅ No bright gradients
- ✅ No rainbow effects
- ✅ No high contrast neon
- ✅ No strong outlines
- ✅ No hard borders
- ✅ No fast motion
- ✅ No parallax

**Result:** System feels like mission-critical control interface, not marketing site or Web3 landing page.

---

## Success Criteria Verification

### ✅ Sidebar immediately reads as a physical slab
- Reduced opacity (0.64) allows refraction to show
- Thick blur (24px) creates milky appearance
- Inner shadows and light falloff create 3D depth
- Shadow below glass creates physical separation
- **Result:** Sidebar reads as thick, physical glass slab

### ✅ Cards feel embedded in space, not floating on white
- Atmospheric gradient creates depth
- Volumetric lights create spatial context
- Glass cards refract the environment
- Shadow below glass embeds them in space
- **Result:** Cards feel embedded in deep space, not floating

### ✅ Glass refracts something real
- Volumetric light fields provide real light to refract
- Noise layer provides texture to refract
- Atmospheric gradient provides color to refract
- Backdrop-filter properly refracts the environment
- **Result:** Glass clearly refracts a real environment

### ✅ The UI feels quiet, powerful, and expensive
- Subtle atmospheric gradient (not dark mode)
- Soft volumetric lights (not harsh)
- Thick, milky glass (not transparent)
- Static light emission (not animated)
- Enterprise restraint maintained
- **Result:** UI feels like expensive, mission-critical system

### ✅ Nothing feels cute, playful, or trendy
- No bright colors
- No fast motion
- No decorative effects
- No theme pack appearance
- Enterprise restraint enforced
- **Result:** System maintains mission-critical credibility

---

## Files Modified

1. `src/components/layout/AppShell.tsx` - Added cinematic environment layers (atmospheric gradient, volumetric lights, noise)
2. `src/lib/design-tokens.ts` - Rewrote glass tokens for cinematic material
3. `src/app/globals.css` - Updated glass-panel class for thick, physical glass
4. `src/components/ui/Button.tsx` - Added static light emission to primary buttons

---

## Technical Details

### Atmospheric Gradient

**Color Specification:**
- Near-black charcoal: rgba(45-50, 40-45, 55-60, 0.10-0.12)
- Deep violet gray: rgba(35-40, 30-35, 45-50, 0.14-0.16)
- Very low saturation (subtle violet-gray tones)
- No pure black or pure white

**Gradient Construction:**
- Three overlapping gradients for subtle depth
- Large spreads (70% transparent zones)
- Smooth transitions (no banding)

### Volumetric Light Fields

**Light Specification:**
- Primary: Ellipse 80% 100% at 25% 45%, pink tint 0.08 opacity
- Secondary: Ellipse 100% 80% at 75% 85%, pink tint 0.06 opacity
- 60px filter blur for extreme softness
- Large radii (60-65% transparent zones)

**Implementation:**
- Fixed positioning, z-index 0
- Filter blur applied (not backdrop-filter)
- Pink #fce1ef as tint only (never solid)

### Glass Material

**Opacity Rationale:**
- 0.64 for sidebar: Low enough to show refraction, high enough for readability
- 0.68 for cards: Slightly higher for better content visibility
- Range 0.55-0.72 creates milky, physical appearance

**Backdrop Filter:**
- 24px blur: Thick enough for milky appearance
- 135% saturate: Enhances refraction without oversaturation
- Creates physical glass material, not UI panel

**Depth Cues:**
- Inner glow: Top edge light emission
- Light falloff: Gradual light inside glass
- Inner shadow: Depth shaping
- Shadow below: Physical separation from background
- Combined: Creates thick, 3D glass appearance

### Light Emission

**Static Glow Specification:**
- Outer glow: 16px radius, 0.25 opacity pink
- Inner glow: 8px radius, 0.15 opacity pink
- Top highlight: 1px inset, 0.30 opacity white
- Only on focused/active energy states
- Static only (no animation)

**Result:** Adds presence and importance without motion or distraction.

### Noise Layer

**Specification:**
- Higher frequency: baseFrequency 3.0 (finer grain)
- 4 octaves for texture detail
- 0.035 opacity (0.02-0.05 range)
- Overlay blend mode for integration

**Why Essential:** Noise provides physical texture that glass refracts, making glass look real rather than fake.

---

## Design Principles

### Cinematic but Enterprise

**Key Balance:**
- Cinematic atmosphere without losing enterprise credibility
- Dark-to-neutral gradient (not dark mode)
- Subtle volumetric lights (not dramatic)
- Thick glass (not transparent)
- Static effects (not animated)

**Result:** Mission-critical system that feels expensive and powerful, not cute or trendy.

### Physical Material Language

**Glass as Physical Object:**
- Thick, milky appearance (not transparent)
- Refracts real environment (not flat)
- Has depth and weight (not floating)
- Casts shadow (not flat panel)

**Result:** Glass feels like physical material, not UI decoration.

### Restraint and Presence

**Static Presence:**
- Light emission is static (no animation)
- Atmospheric gradient is static (no motion)
- Volumetric lights are static (no movement)
- Effects add presence without distraction

**Result:** Quiet, powerful, expensive feeling without motion.

---

## Comparison: Before vs After

### Before Phase 6
- Flat white background
- Glass looked like white panels with blur
- No atmospheric depth
- No volumetric lighting
- Cards floated on white surface

### After Phase 6
- Atmospheric gradient creates depth
- Glass reads as thick, physical slabs
- Volumetric lights provide spatial context
- Cards embedded in space
- Mission-critical, expensive feel

---

## Verification Checklist

✅ **Sidebar immediately reads as a physical slab**
- Thick glass appearance with 24px blur
- Inner shadows and light falloff create 3D depth
- Shadow below glass creates physical separation
- Reads as physical material, not UI panel

✅ **Cards feel embedded in space, not floating on white**
- Atmospheric gradient creates depth context
- Glass refracts the environment
- Shadow below embeds cards in space
- No longer float on flat white

✅ **Glass refracts something real**
- Volumetric lights provide real light to refract
- Noise layer provides texture to refract
- Atmospheric gradient provides color to refract
- Backdrop-filter clearly refracts environment

✅ **The UI feels quiet, powerful, and expensive**
- Subtle, restrained effects
- No bright colors or harsh contrasts
- Static effects (no animation)
- Enterprise restraint maintained
- Feels like expensive, mission-critical system

✅ **Nothing feels cute, playful, or trendy**
- No bright gradients or neon
- No fast motion or parallax
- No decorative effects
- No theme pack appearance
- Maintains mission-critical credibility

---

## Next Steps

Phase 6 cinematic material layer is complete. The system now has:

- Atmospheric depth environment
- Volumetric light fields
- Physical, thick glass material
- Static light emission
- Global noise layer
- Enterprise restraint maintained

**Result:** Cinematic enterprise interface that feels quiet, powerful, and expensive while maintaining mission-critical credibility.

