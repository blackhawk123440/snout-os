# Brand Color Implementation - Authoritative

**Date:** 2025-01-27  
**Principle:** Brand colors are applied as atmospheric light and glass refraction only. Never as fills, backgrounds, or text.

---

## Real Brand Colors

**Primary Brand Light:** Soft blush pink (#fce1ef / rgba(252, 225, 239))  
**Secondary Brand Anchor:** Warm dark brown (rgba(67, 47, 33))  
**Neutral Base:** White (#ffffff)

**There is no accent color beyond these.** This keeps things premium.

---

## Color Application Rules (Non-Negotiable)

### 1. Base Surface (Unchanged)

- **Main canvas stays white**
- **Cards stay white or milky glass**
- **Text stays neutral dark gray or near-black**

**This is non-negotiable.** White dominance is maintained.

### 2. Atmospheric Field (PRIMARY PINK)

**Pink becomes ambient light, not color.**

**Implementation:**
- Very large radial gradients (1500px+ radius)
- Low saturation (10% saturation filter)
- Extremely low opacity (0.035-0.045)
- Never boxed
- Never sharp
- Blend mode: normal only

**Rules:**
- Opacity ceiling: 0.08 max
- Saturation ceiling: 12% max
- Radius: massive (1200px+)
- Blend mode: normal only

**Think:** The UI is sitting inside a pink-tinted room, not painted pink.

**Test:** If you can "see pink", it's too much. Brand color presence should be felt, not seen.

### 3. Glass Tint (PRIMARY PINK, EVEN LOWER)

**Glass panels get a hint of pink refraction. Not background color. Not overlay. Refraction only.**

**Rules:**
- Glass base stays white (never pink background)
- Pink tint opacity: 0.04-0.07 (edge lighting only)
- Border edge tint: 0.06-0.08 max
- Blur: 14-18px (slightly reduced from 24px for better refraction)
- Saturation: 110% (pink refraction comes from ambient light, not saturation)

**This is what gives the futuristic opaque look.**

### 4. Action Energy (DARK BROWN, NOT PINK)

**Dark brown is not a text color here. It becomes weight/authority.**

**Use it for:**
- Focus rings (outline on focus-visible)
- Button depth (focus/active states)
- Active state grounding
- Rare divider emphasis

**Never:**
- Glow it
- Animate it
- Use as text color (text stays dark gray/near-black)

**Principle:** Pink is emotion. Brown is authority.

### 5. Buttons (STRICT)

**Primary buttons:**
- White or glass base (never pink background)
- Subtle pink refraction/glow (0.06-0.08 opacity max)
- Brown focus ring on focus/active (authority, not decoration)
- Pink glow only at 0.06-0.08 opacity (felt, not seen)

**Secondary buttons:**
- Silent by default
- No glow
- No tint until hover or focus

**Test:** If buttons look "fun", you've failed. They must feel serious and authoritative.

### 6. Sidebar (MOST IMPORTANT)

**The sidebar should be:**
- Frosted glass (white base, not pink)
- White dominant
- Pink-tinted refraction (from ambient light)
- Edge-lit subtly on top/left (0.05 opacity pink tint)
- Slight noise

**This alone makes the app feel:**
- Alive
- High tech
- Opaque
- Like a real system

**Current state:** Sidebar is frosted glass with pink-tinted refraction (correct).

---

## Implementation Details

### Atmospheric Field

**Before:** Dark charcoal/violet-gray gradients  
**After:** Pink ambient light field

```css
background: `
  radial-gradient(ellipse 1500px 1500px at 30% 40%, rgba(252, 225, 239, 0.045) 0%, transparent 75%),
  radial-gradient(ellipse 1500px 1500px at 70% 70%, rgba(252, 225, 239, 0.035) 0%, transparent 75%)
`;
filter: 'saturate(0.10)'; /* 10% saturation - very low */
```

**Key changes:**
- Massive radii (1500px) for ambient feel
- Very low opacity (0.035-0.045)
- Low saturation (10%)
- Pink only, no dark colors
- Normal blend mode

### Glass Material

**Pink-tinted refraction only (not pink background):**

- Background: `rgba(255, 255, 255, 0.64)` - White base (never pink)
- Border: `rgba(252, 225, 239, 0.06)` - Pink-tinted edge only (0.08 max)
- Edge lighting: `rgba(252, 225, 239, 0.05)` - Top edge tint (0.04-0.07 range)
- Blur: 16px (14-18px range)
- Saturation: 110% (pink refraction from ambient light, not saturation)

**Principle:** Glass refracts the pink ambient light, but glass itself is white.

### Button Light Emission

**Before:** Pink glow at 0.15-0.25 opacity  
**After:** Pink glow at 0.05-0.07 opacity, brown focus ring

```typescript
boxShadow: `0 0 16px 0 rgba(252, 225, 239, 0.07), 0 0 8px 0 rgba(252, 225, 239, 0.05), ...`
outline: `2px solid rgba(67, 47, 33, 0.40)` // Brown focus ring
```

**Key changes:**
- Pink glow reduced to 0.06-0.08 opacity (felt, not seen)
- Brown focus ring added (authority, not decoration)
- No pink backgrounds (buttons stay white/pink color)

### Focus States

**Before:** Pink outline  
**After:** Brown outline (authority)

```css
*:focus-visible {
  outline: 2px solid rgba(67, 47, 33, 0.50); /* Warm dark brown for authority */
  outline-offset: 2px;
}
```

**Principle:** Brown = authority, seriousness. Pink = emotion, light.

---

## Why This Matters

### Current Problem

**What you're seeing:**
- Correct structure
- Correct spacing
- Correct hierarchy
- But no atmospheric layer

**Result:** Clean but static. Built the brain, haven't turned on the light field.

### Solution

**Brand colors as atmospheric light and glass refraction:**
- Pink ambient light field (felt, not seen)
- Glass refracts pink light (but glass is white)
- Brown for authority (focus rings, depth)
- White dominance maintained

**Result:** UI feels alive, high tech, opaque, like a real system.

---

## Verification Checklist

✅ **Base surface unchanged**
- Main canvas is white
- Cards are white or milky glass
- Text is dark gray/near-black (not brown)

✅ **Atmospheric field uses pink as ambient light**
- Very large radii (1500px+)
- Very low opacity (0.035-0.045)
- Low saturation (10%)
- Normal blend mode
- If you can "see pink", it's too much

✅ **Glass uses pink-tinted refraction only**
- Glass base is white (never pink)
- Pink tint only in edge lighting (0.04-0.07 opacity)
- Border edge tint (0.06-0.08 max)
- Blur 14-18px

✅ **Brown used for authority (not text)**
- Focus rings use brown
- Button focus/active states use brown outline
- Not used as text color
- Not animated or glowing

✅ **Buttons follow strict rules**
- Primary buttons: White/glass base, subtle pink glow (0.06-0.08), brown focus ring
- Secondary buttons: Silent by default
- Buttons don't look "fun" - they feel serious

✅ **Sidebar is frosted glass**
- White base
- Pink-tinted refraction
- Edge-lit subtly
- Feels alive and high tech

✅ **UI remains white-dominant**
- Brand color presence is felt, not seen
- Enterprise restraint maintained
- Premium feel preserved

---

## Files Modified

1. `src/components/layout/AppShell.tsx` - Updated atmospheric field to pink ambient light
2. `src/app/globals.css` - Updated glass material (pink refraction only), focus states (brown)
3. `src/components/ui/Button.tsx` - Reduced pink glow opacity, added brown focus ring

---

## Key Principle

**Brand colors are applied as atmospheric light and glass refraction only. Never as fills, backgrounds, or text. The UI must remain white-dominant and enterprise. Brand color presence should be felt, not seen.**

