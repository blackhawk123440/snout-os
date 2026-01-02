# Control Surface Component Contract

## Rules (Non-Negotiable)

Every control surface component MUST:

1. **Use design tokens ONLY**
   - Colors: `controlSurface.colors.*`
   - Spacing: `controlSurface.spacing.*`
   - Typography: `controlSurface.typography.*`
   - Shadows: `controlSurface.spatial.elevation.*`
   - Borders: `controlSurface.spatial.border.*`
   - Motion: `controlSurface.motion.*`

2. **NO raw hex values**
   - ❌ `#ffffff`, `#000000`, `rgb(...)`, `rgba(...)`
   - ✅ Use tokens: `controlSurface.colors.base.depth1`

3. **NO raw shadow values**
   - ❌ `boxShadow: '0 2px 4px rgba(0,0,0,0.1)'`
   - ✅ Use tokens: `controlSurface.spatial.elevation.panel`

4. **NO raw spacing/px values**
   - ❌ `padding: '12px'`, `margin: '8px'`
   - ✅ Use tokens: `controlSurface.spacing[4]`

5. **NO ad-hoc animations**
   - ❌ Custom keyframes or transitions
   - ✅ Use tokens: `controlSurface.motion.patterns.breathe`

6. **NO Tailwind color classes**
   - ❌ `bg-gray-100`, `text-blue-500`
   - ✅ Use tokens via inline styles

7. **Respect posture context**
   - Components should use `usePosture()` to adapt behavior
   - Motion, spacing, voltage should respond to posture

## Enforcement

- **Lint rule**: Add ESLint rule to `src/components/control-surface/**/*.tsx`
- **Code review**: Check for raw hex, raw shadows, raw px values
- **Type safety**: Prefer token types over raw strings

## Example: Good ✅

```tsx
import { controlSurface } from '@/lib/design-tokens-control-surface';
import { usePosture } from './PostureProvider';

export const MyComponent = () => {
  const { config } = usePosture();
  
  return (
    <div
      style={{
        backgroundColor: controlSurface.colors.base.depth1,
        padding: controlSurface.spacing[4],
        boxShadow: controlSurface.spatial.elevation.panel,
        transition: `all ${controlSurface.motion.duration.base} ${controlSurface.motion.easing.ambient}`,
      }}
    >
      Content
    </div>
  );
};
```

## Example: Bad ❌

```tsx
export const MyComponent = () => {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',  // ❌ Raw hex
        padding: '12px',              // ❌ Raw px
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)', // ❌ Raw shadow
      }}
      className="bg-gray-100"  // ❌ Tailwind color
    >
      Content
    </div>
  );
};
```

## File Location

All components in `src/components/control-surface/` must follow this contract.

Violations should be caught in:
1. ESLint rules (if configured)
2. Code review
3. Type checking (where possible)

