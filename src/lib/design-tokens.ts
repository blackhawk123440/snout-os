/**
 * Design Tokens - System DNA Implementation
 * 
 * Canonical design tokens for the enterprise control surface.
 * Built on white + soft pink #fce1ef as primary materials.
 * 
 * All colors, spacing, typography, shadows, and radii must come from these tokens.
 * No raw hex values or px values allowed in components.
 * 
 * The system uses white as the dominant surface and pink #fce1ef for system identity and focus.
 * Contrast is achieved through depth, opacity, spacing, and motion - not dark backgrounds.
 */

/**
 * Primary Materials
 * White is the dominant surface. Pink #fce1ef defines system identity.
 */
const MATERIAL_WHITE = '#ffffff';
const MATERIAL_PINK = '#fce1ef';

/**
 * Pink Energy Scale
 * Pink intensity increases subtly for focus, readiness, or importance.
 * Energy is communicated through opacity shifts, edges, and restrained glow.
 * No harsh saturation. No aggressive color blocks.
 */
const pinkEnergyScale = {
  idle: '#fce1ef',      // Base soft pink (RGB: 252, 225, 239)
  aware: '#fbd8ea',     // Slightly more present
  focused: '#facfe5',   // Moderate focus
  active: '#f9c6e0',    // Higher energy
  critical: '#f8bddb',  // Maximum but controlled
};

export const tokens = {
  // ===== COLORS =====
  colors: {
    /**
     * Primary: Pink #fce1ef system
     * Color behaves as energy, not decoration.
     * 
     * New system uses: idle, aware, focused, active, critical
     * Legacy numeric scale maintained for backward compatibility during migration
     */
    primary: {
      // Base pink material
      material: MATERIAL_PINK,
      
      // Energy-based intensity scale (new system)
      idle: pinkEnergyScale.idle,
      aware: pinkEnergyScale.aware,
      focused: pinkEnergyScale.focused,
      active: pinkEnergyScale.active,
      critical: pinkEnergyScale.critical,
      
      // Default uses focused level
      DEFAULT: pinkEnergyScale.focused,
      
      // Legacy numeric scale (backward compatibility - will be removed after migration)
      50: pinkEnergyScale.idle,
      100: pinkEnergyScale.aware,
      200: MATERIAL_PINK, // Base material
      300: pinkEnergyScale.focused,
      400: pinkEnergyScale.active,
      500: pinkEnergyScale.critical,
      600: '#432f21', // Legacy dark color for contrast
      700: '#351f16',
      800: '#27100c',
      900: '#1a0802',
      
      // Opacity variants for layering
      opacity: {
        5: 'rgba(252, 225, 239, 0.05)',
        10: 'rgba(252, 225, 239, 0.10)',
        20: 'rgba(252, 225, 239, 0.20)',
        30: 'rgba(252, 225, 239, 0.30)',
        40: 'rgba(252, 225, 239, 0.40)',
        50: 'rgba(252, 225, 239, 0.50)',
        60: 'rgba(252, 225, 239, 0.60)',
        70: 'rgba(252, 225, 239, 0.70)',
        80: 'rgba(252, 225, 239, 0.80)',
        90: 'rgba(252, 225, 239, 0.90)',
      },
    },
    
    /**
     * White Material
     * Dominant surface. Establishes clarity and calm.
     */
    white: {
      material: MATERIAL_WHITE,
      DEFAULT: MATERIAL_WHITE,
      
      // Subtle variations for depth
      pure: '#ffffff',
      soft: '#fefefe',
      warm: '#fdfdfd',
    },
    
    /**
     * Neutrals
     * Achieve contrast through depth, opacity, spacing - not dark backgrounds.
     */
    neutral: {
      0: '#ffffff',
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      DEFAULT: '#525252',
    },
    
    /**
     * Status Colors
     * Restrained, authoritative. Never aggressive.
     */
    success: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857', // Legacy support
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
      700: '#b45309', // Legacy support
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
      700: '#b91c1c', // Legacy support
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
      700: '#1d4ed8', // Legacy support
      800: '#1e40af',
      900: '#1e3a8a',
      DEFAULT: '#3b82f6',
    },
    
    // Semantic aliases
    background: {
      primary: MATERIAL_WHITE,
      secondary: '#fafafa',
      tertiary: '#f5f5f5',
    },
    
    text: {
      primary: '#171717',
      secondary: '#525252',
      tertiary: '#737373',
      disabled: '#a3a3a3',
      inverse: '#ffffff', // Legacy support
      brand: MATERIAL_PINK, // Legacy support
    },
    
    border: {
      default: '#e5e5e5',
      muted: '#f5f5f5',
      strong: '#d4d4d4',
      focus: MATERIAL_PINK,
    },
  },
  
  // ===== SPACING =====
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
      '5xl': ['3rem', { lineHeight: '1' }],         // 48px (legacy support)
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
  
  // ===== SHADOWS =====
  /**
   * Shadows create depth and spatial hierarchy.
   * Restrained, subtle. Never aggressive.
   */
  shadows: {
    // Subtle depth for surfaces
    surface: '0 1px 2px 0 rgba(252, 225, 239, 0.05)',
    
    // Elevated panels
    elevated: '0 4px 6px -1px rgba(252, 225, 239, 0.08), 0 2px 4px -2px rgba(252, 225, 239, 0.04)',
    
    // Overlays and modals
    overlay: '0 10px 15px -3px rgba(252, 225, 239, 0.10), 0 4px 6px -4px rgba(252, 225, 239, 0.05)',
    
    // Critical overlays
    critical: '0 20px 25px -5px rgba(252, 225, 239, 0.12), 0 8px 10px -6px rgba(252, 225, 239, 0.06)',
    
    // Legacy aliases (for gradual migration)
    xs: '0 1px 2px 0 rgba(252, 225, 239, 0.05)',
    sm: '0 1px 3px 0 rgba(252, 225, 239, 0.06), 0 1px 2px -1px rgba(252, 225, 239, 0.04)',
    DEFAULT: '0 4px 6px -1px rgba(252, 225, 239, 0.08), 0 2px 4px -2px rgba(252, 225, 239, 0.04)',
    md: '0 10px 15px -3px rgba(252, 225, 239, 0.10), 0 4px 6px -4px rgba(252, 225, 239, 0.05)',
    lg: '0 20px 25px -5px rgba(252, 225, 239, 0.12), 0 8px 10px -6px rgba(252, 225, 239, 0.06)',
    xl: '0 25px 50px -12px rgba(252, 225, 239, 0.15)', // Legacy support
    inner: 'inset 0 2px 4px 0 rgba(252, 225, 239, 0.05)', // Legacy support
    none: 'none',
  },
  
  // ===== GLASS MATERIAL (Phase 5B) =====
  /**
   * Frosted glass material system for futuristic opaque surfaces.
   * Creates milky glass panels that feel like frosted glass on a white lab surface.
   * Enterprise restrained - opaque but alive, not transparent.
   */
  glass: {
    // Background: rgba white with opacity for milky glass effect
    background: 'rgba(255, 255, 255, 0.80)', // 0.72 to 0.88 range, using 0.80
    
    // Border: 1px rgba with pink tint at very low opacity
    border: '1px solid rgba(252, 225, 239, 0.15)',
    
    // Shadow: tuned pink shadow for glass panels
    shadow: '0 4px 6px -1px rgba(252, 225, 239, 0.10), 0 2px 4px -2px rgba(252, 225, 239, 0.06)',
    
    // Inner highlight: inset shadow for depth
    innerHighlight: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.60)',
    
    // Edge lighting: top and left edge highlights with pink tint at extremely low opacity
    edgeTop: 'inset 0 1px 0 0 rgba(252, 225, 239, 0.20)',
    edgeLeft: 'inset 1px 0 0 0 rgba(252, 225, 239, 0.15)',
    
    // Backdrop blur: 12 to 18px range, using 15px
    blur: '15px',
    
    // Saturate: 120 to 140% range, using 130% for crisp optical feel
    saturate: '130%',
    
    // Noise opacity: 0.03 to 0.06 range, using 0.04
    noiseOpacity: 0.04,
  },
  
  // ===== LAYOUT =====
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
  
  // ===== Z-INDEX =====
  /**
   * Spatial depth layers
   * The interface exists in depth, not flat layers.
   */
  zIndex: {
    base: 0,
    surface: 1,
    elevated: 10,
    overlay: 100,
    critical: 200,
    
    // Legacy aliases (for gradual migration)
    dropdown: 100,
    sticky: 10,
    fixed: 20,
    modalBackdrop: 100,
    modal: 200,
    popover: 150,
    tooltip: 150,
  },
  
  // ===== TRANSITIONS =====
  /**
   * Temporal intelligence: continuous, time-aware transitions
   * Motion communicates intelligence and readiness only.
   */
  transitions: {
    duration: {
      ambient: '2000ms',      // Slow, continuous breathing
      transition: '300ms',    // Smooth state change
      readiness: '150ms',     // Quick but not abrupt
      critical: '200ms',      // Controlled urgency
      
      // Legacy aliases
      fast: '150ms',
      DEFAULT: '300ms',
      slow: '300ms',
    },
    
    timingFunction: {
      ambient: 'cubic-bezier(0.4, 0, 0.2, 1)',      // Smooth, natural
      transition: 'cubic-bezier(0.4, 0, 0.2, 1)',   // Continuous
      readiness: 'cubic-bezier(0.25, 0.1, 0.25, 1)', // Slightly tighter
      critical: 'cubic-bezier(0.2, 0, 0, 1)',       // Precise, controlled
      
      // Legacy aliases
      DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
} as const;

// Type-safe token access helpers
export type ColorToken = keyof typeof tokens.colors;
export type SpacingToken = keyof typeof tokens.spacing;
export type FontSizeToken = keyof typeof tokens.typography.fontSize;
export type FontWeightToken = keyof typeof tokens.typography.fontWeight;
