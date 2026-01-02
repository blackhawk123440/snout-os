/**
 * Design Tokens - Living Interface System
 * 
 * Enterprise design system tokens for a living, time-aware interface.
 * All colors, spacing, typography, shadows, motion, depth, and opacity
 * must come from these tokens.
 * 
 * System DNA:
 * - White and Pink #fce1ef as primary materials
 * - Time-aware, continuous, ambient motion
 * - Depth and opacity for spatial hierarchy
 * - Posture-aware design (observational, analytical, configuration, operational, critical)
 * 
 * No raw hex values or px values allowed in components.
 */

export const tokens = {
  // ===== COLORS =====
  colors: {
    // Primary System Color: Pink #fce1ef
    // Used with restraint as controlled voltage, not branding paint
    // Pink intensifies subtly to indicate focus, readiness, or importance
    primary: {
      50: '#fef7fb',   // Lightest - ambient presence
      100: '#fef2f8',  // Very light - subtle emphasis
      200: '#fce1ef',  // BASE - Primary system color (the pink)
      300: '#f9d0e5',  // Slightly intensified - focus areas
      400: '#f5bfdb',  // Moderate intensity - active states
      500: '#f2aed1',  // Higher intensity - important actions
      600: '#e89fc4',  // Strong - critical focus
      700: '#dc8fb5',  // Stronger - elevated importance
      800: '#ce7fa4',  // Very strong - reserved use
      900: '#be6f91',  // Maximum - critical states only
      DEFAULT: '#fce1ef', // The primary pink
    },
    
    // Surface: White as dominant material
    // Establishes clarity, calm, and space
    surface: {
      base: '#ffffff',        // Primary surface - white
      elevated: '#ffffff',    // Elevated panels (same white, depth through shadow)
      inset: '#fef7fb',       // Subtle inset areas (very light pink tint)
      overlay: 'rgba(255, 255, 255, 0.95)', // Overlay surfaces
    },
    
    // Neutrals - refined for white-dominant system
    // Contrast achieved through depth, opacity, shadow, not dark backgrounds
    neutral: {
      0: '#ffffff',   // Pure white
      50: '#fafafa',  // Very light gray - subtle separation
      100: '#f5f5f5', // Light gray - gentle distinction
      200: '#e5e5e5', // Border gray - soft edges
      300: '#d4d4d4', // Medium-light - muted emphasis
      400: '#a3a3a3', // Medium - secondary text
      500: '#737373', // Medium-dark - tertiary text
      600: '#525252', // Dark - secondary text
      700: '#404040', // Darker - primary text
      800: '#262626', // Very dark - strong text
      900: '#171717', // Near black - maximum contrast text
      DEFAULT: '#525252',
    },
    
    // Status colors - preserved but refined for white system
    success: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
      DEFAULT: '#10b981',
    },
    
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
      DEFAULT: '#f59e0b',
    },
    
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
      DEFAULT: '#ef4444',
    },
    
    info: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      DEFAULT: '#3b82f6',
    },
    
    // Semantic aliases - evolved for white + pink system
    background: {
      primary: '#ffffff',        // White dominant
      secondary: '#fef7fb',      // Subtle pink tint (very light)
      tertiary: '#f5f5f5',       // Light neutral
      inverse: '#171717',        // Dark - rarely used
    },
    
    text: {
      primary: '#171717',        // Near black on white
      secondary: '#525252',      // Medium gray
      tertiary: '#737373',       // Lighter gray
      disabled: '#a3a3a3',       // Muted
      inverse: '#ffffff',        // White on dark (rare)
      brand: '#fce1ef',          // The pink (for accents only)
    },
    
    border: {
      default: '#e5e5e5',        // Soft gray borders
      muted: '#f5f5f5',          // Very light borders
      strong: '#d4d4d4',         // Visible borders
      focus: '#fce1ef',          // Pink focus ring
    },
  },
  
  // ===== MOTION =====
  // Time-aware, continuous, ambient motion
  // Motion communicates intelligence and readiness, not animation
  motion: {
    // Duration - posture-aware timing
    duration: {
      instant: '0ms',            // Immediate (no visible transition)
      fast: '150ms',             // Quick state changes
      DEFAULT: '300ms',          // Standard transitions
      ambient: '600ms',          // Ambient, breathing-like motion
      slow: '800ms',             // Deliberate, calming transitions
      idle: '2000ms',            // Idle breathing animation
    },
    
    // Timing functions - feel like breathing, not triggering
    easing: {
      // Standard - smooth and controlled
      DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
      
      // Ambient - breathing-like, continuous
      ambient: 'cubic-bezier(0.4, 0, 0.6, 1)',
      breathe: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // Gentle sine-like
      
      // Active - tighter, more responsive
      active: 'cubic-bezier(0.2, 0, 0, 1)',
      
      // Entrance - gentle arrival
      enter: 'cubic-bezier(0, 0, 0.2, 1)',
      
      // Exit - smooth departure
      exit: 'cubic-bezier(0.4, 0, 1, 1)',
    },
    
    // Posture-specific motion characteristics
    posture: {
      // Observational (dashboards, overviews)
      observational: {
        duration: '600ms',
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        intensity: 'subtle',
      },
      
      // Analytical (payments, analytics, charts)
      analytical: {
        duration: '400ms',
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        intensity: 'moderate',
      },
      
      // Configuration (settings, forms)
      configuration: {
        duration: '200ms',
        easing: 'cubic-bezier(0.4, 0, 1, 1)',
        intensity: 'minimal',
      },
      
      // Operational (bookings, workflows)
      operational: {
        duration: '250ms',
        easing: 'cubic-bezier(0.2, 0, 0, 1)',
        intensity: 'focused',
      },
      
      // Critical (errors, confirmations)
      critical: {
        duration: '150ms',
        easing: 'cubic-bezier(0.4, 0, 1, 1)',
        intensity: 'precise',
      },
    },
  },
  
  // ===== DEPTH =====
  // Spatial hierarchy through depth, not flat layers
  // Panels feel anchored in space
  depth: {
    // Elevation levels - how "far" from surface
    elevation: {
      base: 0,              // On surface
      raised: 1,            // Slightly elevated (cards, inputs)
      floating: 2,          // Floating (dropdowns, popovers)
      overlay: 3,           // Overlay (modals, sidebars)
      critical: 4,          // Maximum (critical modals)
    },
    
    // Shadow system - creates depth, not decoration
    shadows: {
      // Subtle - ambient presence
      subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 1px 0 rgba(0, 0, 0, 0.02)',
      
      // Soft - gentle elevation
      soft: '0 2px 4px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
      
      // Default - standard elevation
      DEFAULT: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.03)',
      
      // Medium - noticeable elevation
      md: '0 10px 15px -3px rgba(0, 0, 0, 0.06), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
      
      // Large - strong elevation
      lg: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
      
      // Focus glow - pink energy indication
      focusGlow: '0 0 0 3px rgba(252, 225, 239, 0.3)', // Pink glow
      focusGlowStrong: '0 0 0 3px rgba(252, 225, 239, 0.5)',
      
      // Inner - inset depth
      inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.03)',
      
      none: 'none',
    },
    
    // Z-index scale (preserved from original)
    zIndex: {
      base: 0,
      dropdown: 1000,
      sticky: 1020,
      fixed: 1030,
      modalBackdrop: 1040,
      modal: 1050,
      popover: 1060,
      tooltip: 1070,
    },
  },
  
  // ===== OPACITY =====
  // Visual energy through opacity shifts
  // Pink intensity changes through opacity, not saturation
  opacity: {
    // Standard opacity scale
    transparent: 0,
    invisible: 0.05,    // Barely perceptible
    subtle: 0.1,        // Very subtle
    light: 0.2,         // Light overlay
    soft: 0.3,          // Soft emphasis
    muted: 0.4,         // Muted state
    DEFAULT: 0.5,       // Standard overlay
    visible: 0.6,       // More visible
    strong: 0.7,        // Strong overlay
    prominent: 0.8,     // Prominent
    opaque: 0.9,        // Nearly opaque
    solid: 1,           // Fully opaque
    
    // State-specific opacity
    states: {
      disabled: 0.4,        // Disabled elements
      hover: 0.8,           // Hover overlay
      active: 0.9,          // Active state
      focus: 1,             // Focus state (full)
      idle: 0.7,            // Idle/resting state
    },
  },
  
  // ===== SPACING =====
  // Preserved - spacing rhythm remains consistent
  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
  },
  
  // ===== TYPOGRAPHY =====
  // Preserved - typography scale remains consistent
  typography: {
    fontFamily: {
      sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
    },
    
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
      sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
      base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
      lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
      xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
      '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px
      '5xl': ['3rem', { lineHeight: '1' }],         // 48px
    },
    
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    
    letterSpacing: {
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
    },
  },
  
  // ===== BORDER RADIUS =====
  // Preserved - corner rounding remains consistent
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    DEFAULT: '0.375rem', // 6px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
    '2xl': '1.5rem',  // 24px
    full: '9999px',
  },
  
  // ===== LAYOUT =====
  // Preserved - layout structure remains consistent
  layout: {
    appShell: {
      sidebarWidth: '16rem',    // 256px
      sidebarWidthCollapsed: '4rem', // 64px
      topBarHeight: '4rem',     // 64px
      contentMaxWidth: '1400px',
      contentPadding: '1.5rem', // 24px
    },
    
    breakpoints: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
  },
  
  // ===== LEGACY SHADOWS (deprecated, use depth.shadows) =====
  // Kept for backwards compatibility during transition
  // Components should migrate to depth.shadows
  shadows: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    DEFAULT: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    md: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    lg: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    xl: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
    none: 'none',
  },
  
  // ===== LEGACY TRANSITIONS (deprecated, use motion) =====
  // Kept for backwards compatibility during transition
  // Components should migrate to motion.duration and motion.easing
  transitions: {
    duration: {
      fast: '150ms',
      DEFAULT: '200ms',
      slow: '300ms',
    },
    timingFunction: {
      DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
  
  // ===== LEGACY Z-INDEX (deprecated, use depth.zIndex) =====
  // Kept for backwards compatibility during transition
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
} as const;

// Type-safe token access helpers
export type ColorToken = keyof typeof tokens.colors;
export type SpacingToken = keyof typeof tokens.spacing;
export type FontSizeToken = keyof typeof tokens.typography.fontSize;
export type FontWeightToken = keyof typeof tokens.typography.fontWeight;
export type PostureType = keyof typeof tokens.motion.posture;
