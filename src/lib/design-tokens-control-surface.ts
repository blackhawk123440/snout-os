/**
 * Control Surface Design Tokens
 * 
 * Enterprise control surface design system.
 * Dark base, pink as voltage/energy flow, not branding.
 * Temporal intelligence, spatial depth, visual restraint.
 * 
 * These tokens establish the DNA for a living control surface.
 */

export const controlSurface = {
  // ===== COLOR SYSTEM: ENERGY MODEL =====
  // Dark, restrained base. Pink as voltage flow. Color intensity = system importance.
  
  colors: {
    // Base: Dark, restrained foundation
    base: {
      // Dark base scale (primary background)
      depth0: '#0a0a0a',      // Deepest - where panels float
      depth1: '#121212',      // Panel backgrounds
      depth2: '#1a1a1a',      // Elevated panels
      depth3: '#222222',      // Highest elevation
      
      // Neutral text and borders
      neutral: {
        primary: '#e5e5e5',   // Primary text (highest contrast)
        secondary: '#a3a3a3', // Secondary text
        tertiary: '#737373',  // Tertiary text (hints)
        quaternary: '#525252', // Very subtle (metadata)
        border: '#2a2a2a',    // Subtle borders
        divider: '#1f1f1f',   // Subtle dividers
      },
    },
    
    // Voltage: Pink as energy flow
    // Used for: ambient signals, edge emphasis, focus energy, system state
    voltage: {
      ambient: 'rgba(252, 225, 239, 0.08)',    // Subtle ambient glow (panels, backgrounds)
      edge: 'rgba(252, 225, 239, 0.15)',       // Edge emphasis (borders, dividers)
      focus: 'rgba(252, 225, 239, 0.25)',      // Focus states (active, hover)
      active: 'rgba(249, 208, 229, 0.35)',     // Active elements
      signal: 'rgba(245, 191, 219, 0.45)',     // Important signals
      pulse: 'rgba(242, 174, 209, 0.60)',      // Critical states (rare)
      pure: '#f2aed1',                          // Pure voltage (extremely rare - only for critical focus)
    },
    
    // Status: Restrained, purposeful
    status: {
      success: {
        subtle: 'rgba(16, 185, 129, 0.15)',    // Background tint
        base: '#10b981',                        // Text/icon
        bright: '#34d399',                      // Active signal
      },
      warning: {
        subtle: 'rgba(245, 158, 11, 0.15)',
        base: '#f59e0b',
        bright: '#fbbf24',
      },
      error: {
        subtle: 'rgba(239, 68, 68, 0.15)',
        base: '#ef4444',
        bright: '#f87171',
      },
      info: {
        subtle: 'rgba(59, 130, 246, 0.15)',
        base: '#3b82f6',
        bright: '#60a5fa',
      },
    },
  },
  
  // ===== SPATIAL SYSTEM: DEPTH & LAYERING =====
  // Panels feel anchored in space. Hierarchy through position and depth.
  
  spatial: {
    // Z-index layers (spatial depth)
    depth: {
      base: 0,
      panel: 10,
      elevated: 20,
      floating: 30,
      overlay: 40,
      modal: 50,
      critical: 60,
    },
    
    // Elevation shadows (depth communication)
    elevation: {
      panel: '0 1px 3px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3)',
      elevated: '0 4px 6px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)',
      floating: '0 10px 15px rgba(0, 0, 0, 0.4), 0 4px 6px rgba(0, 0, 0, 0.3)',
      overlay: '0 20px 25px rgba(0, 0, 0, 0.5), 0 10px 10px rgba(0, 0, 0, 0.4)',
    },
    
    // Border radius (spatial anchoring)
    radius: {
      none: '0',
      subtle: '4px',
      base: '8px',
      medium: '12px',
      large: '16px',
      full: '9999px',
    },
    
    // Border system (separation and depth)
    border: {
      subtle: '1px solid rgba(42, 42, 42, 0.6)',
      base: '1px solid rgba(42, 42, 42, 0.8)',
      voltage: '1px solid rgba(252, 225, 239, 0.15)',
      focus: '1px solid rgba(252, 225, 239, 0.25)',
    },
  },
  
  // ===== TYPOGRAPHY: RESTRAINED AUTHORITY =====
  typography: {
    fontFamily: {
      sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
    },
    
    fontSize: {
      xs: ['11px', { lineHeight: '16px', letterSpacing: '0.01em' }],
      sm: ['13px', { lineHeight: '18px', letterSpacing: '0.01em' }],
      base: ['15px', { lineHeight: '22px', letterSpacing: '0' }],
      lg: ['17px', { lineHeight: '24px', letterSpacing: '-0.01em' }],
      xl: ['20px', { lineHeight: '28px', letterSpacing: '-0.01em' }],
      '2xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.02em' }],
      '3xl': ['30px', { lineHeight: '38px', letterSpacing: '-0.02em' }],
    },
    
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  
  // ===== SPACING: RHYTHMIC BREATHING =====
  // Consistent, rhythmic spacing that creates flow
  spacing: {
    0: '0',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
    20: '80px',
    24: '96px',
  },
  
  // ===== MOTION: TEMPORAL INTELLIGENCE =====
  // Ambient, restrained, continuous. Motion communicates intelligence.
  motion: {
    // Timing functions (continuous, intelligent)
    easing: {
      ambient: 'cubic-bezier(0.4, 0, 0.2, 1)',      // Smooth, continuous
      responsive: 'cubic-bezier(0.4, 0, 0.6, 1)',   // Responsive, elastic
      tight: 'cubic-bezier(0.5, 0, 0.5, 1)',        // Tight, precise
      idle: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // Idle breathing
    },
    
    // Durations (time-aware)
    duration: {
      instant: '80ms',     // Immediate feedback
      fast: '150ms',       // Quick transitions
      base: '250ms',       // Standard transitions
      slow: '400ms',       // Deliberate transitions
      ambient: '3000ms',   // Ambient breathing (idle states)
    },
    
    // Animation patterns
    patterns: {
      // Subtle breathing (idle states)
      breathe: {
        animation: 'breathe 3s ease-in-out infinite',
        keyframes: `
          @keyframes breathe {
            0%, 100% { opacity: 0.95; }
            50% { opacity: 1; }
          }
        `,
      },
      // Gentle pulse (attention states)
      pulse: {
        animation: 'pulse 2s ease-in-out infinite',
        keyframes: `
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.85; }
          }
        `,
      },
      // Smooth fade (appearances)
      fadeIn: {
        animation: 'fadeIn 250ms ease-out',
        keyframes: `
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `,
      },
    },
  },
  
  // ===== LAYOUT: SPATIAL DISCIPLINE =====
  layout: {
    // Container constraints
    container: {
      maxWidth: '1600px',
      padding: '32px',
      paddingMobile: '16px',
    },
    
    // App shell
    appShell: {
      sidebarWidth: '260px',
      sidebarWidthCollapsed: '80px',
      topBarHeight: '64px',
    },
    
    // Grid system
    grid: {
      columnGap: '24px',
      rowGap: '24px',
    },
  },
  
  // ===== PAGE POSTURES =====
  // Each page type has specific spacing and motion characteristics
  postures: {
    observational: {
      // Dashboards, overviews - calm, wide, slow
      spacing: 'wide',
      motionSpeed: 'slow',
      layoutDensity: 'relaxed',
    },
    analytical: {
      // Payments, analytics - sharper, tighter
      spacing: 'moderate',
      motionSpeed: 'base',
      layoutDensity: 'moderate',
    },
    configuration: {
      // Settings, rules - maximum stability
      spacing: 'tight',
      motionSpeed: 'minimal',
      layoutDensity: 'dense',
    },
    operational: {
      // Bookings, workflows - execution-focused
      spacing: 'moderate',
      motionSpeed: 'base',
      layoutDensity: 'moderate',
    },
    critical: {
      // Errors, confirmations - heightened clarity
      spacing: 'moderate',
      motionSpeed: 'tight',
      layoutDensity: 'moderate',
      contrast: 'high',
    },
  },
};

export type ControlSurfaceTokens = typeof controlSurface;

