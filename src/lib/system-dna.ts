/**
 * System DNA - Canonical Interface System
 * 
 * Immutable rules for all views, components, interactions, and states.
 * This system establishes the authoritative behavior for the entire interface.
 * 
 * The interface exists to:
 * - Manage user attention
 * - Maintain situational awareness
 * - Reduce cognitive load under complexity
 * - Guide action without demanding it
 * 
 * The system must feel present, aware, and composed at all times.
 */

/**
 * System Posture
 * Each view communicates exactly one dominant posture at a time.
 */
export type SystemPosture = 
  | 'observing'    // Observational pages: calm, wide, stable
  | 'analyzing'    // Analytical pages: sharper, tighter, responsive
  | 'configuring'  // Configuration pages: maximum stability, minimal motion
  | 'executing'    // Operational pages: execution-focused, clear action zones
  | 'resolving';   // Critical state pages: heightened clarity, composed tone

/**
 * Page Physiology
 * Each page expresses system DNA through task-appropriate posture.
 * No page may mix physiologies.
 */
export type PagePhysiology = 
  | 'observational'    // Calm posture, wide layouts, slow ambient motion, stable data
  | 'analytical'       // Sharper posture, tighter spacing, elastic charts, responsive transitions
  | 'configuration'    // Maximum stability, minimal motion, strong spatial separation
  | 'operational'      // Execution-focused, reduced ambient motion, clear action zones
  | 'critical';        // Heightened clarity, motion tightens/pauses, pink intensity increases

/**
 * Temporal State
 * The system is time-aware, not event-driven.
 * States ramp up and down gradually.
 */
export interface TemporalState {
  /** Current state value (0-1) */
  value: number;
  /** Target state value (0-1) */
  target: number;
  /** Rate of change per millisecond */
  velocity: number;
  /** Timestamp of last update */
  lastUpdate: number;
}

/**
 * Visual Energy Level
 * Color behaves as energy, not decoration.
 * Pink intensity increases subtly for focus, readiness, or importance.
 */
export type EnergyLevel = 
  | 'idle'      // Base state, minimal energy
  | 'aware'     // Slight increase, awareness present
  | 'focused'   // Moderate increase, attention directed
  | 'active'    // Higher energy, action available
  | 'critical'; // Maximum energy, but still controlled

/**
 * Spatial Depth Layer
 * The interface exists in depth, not flat layers.
 * Panels are spatially anchored with implied separation.
 */
export type DepthLayer = 
  | 'base'      // Base layer (background, surfaces)
  | 'surface'   // Primary surface layer
  | 'elevated'  // Elevated panels, cards
  | 'overlay'   // Overlays, modals
  | 'critical'; // Critical overlays (highest priority)

/**
 * Motion Intent
 * Motion communicates intelligence and readiness only.
 * Must never draw attention to itself.
 */
export type MotionIntent =
  | 'ambient'      // Idle breathing, continuous subtle motion
  | 'transition'   // State change, continuity
  | 'readiness'    // Available action, tightening
  | 'critical';    // Heightened awareness, controlled urgency

/**
 * System Constants
 */
export const SYSTEM_CONSTANTS = {
  /** Primary material: White (dominant surface) */
  MATERIAL_WHITE: '#ffffff',
  
  /** Primary material: Soft pink (system identity and focus) */
  MATERIAL_PINK: '#fce1ef',
  
  /** Temporal update rate (ms) - how often to update continuous states */
  TEMPORAL_UPDATE_RATE: 16, // ~60fps
  
  /** Temporal smoothing factor (0-1) - higher = smoother but slower */
  TEMPORAL_SMOOTHING: 0.15,
  
  /** Minimum temporal transition duration (ms) */
  TEMPORAL_MIN_DURATION: 200,
  
  /** Maximum temporal transition duration (ms) */
  TEMPORAL_MAX_DURATION: 800,
  
  /** Spatial depth offsets (rem) - creates layering effect */
  DEPTH_OFFSETS: {
    base: 0,
    surface: 0,
    elevated: 0.5,
    overlay: 1,
    critical: 1.5,
  },
  
  /** Motion timing curves - cubic bezier for natural motion */
  MOTION_CURVES: {
    ambient: 'cubic-bezier(0.4, 0, 0.2, 1)',      // Smooth, natural
    transition: 'cubic-bezier(0.4, 0, 0.2, 1)',   // Continuous
    readiness: 'cubic-bezier(0.25, 0.1, 0.25, 1)', // Slightly tighter
    critical: 'cubic-bezier(0.2, 0, 0, 1)',       // Precise, controlled
  },
  
  /** Motion durations (ms) - subtle and restrained */
  MOTION_DURATIONS: {
    ambient: 2000,      // Slow, continuous
    transition: 300,    // Smooth state change
    readiness: 150,     // Quick but not abrupt
    critical: 200,      // Controlled urgency
  },
  
  /** Energy level opacity mappings */
  ENERGY_OPACITY: {
    idle: 0.3,      // Minimal presence
    aware: 0.4,     // Slight awareness
    focused: 0.5,   // Moderate focus
    active: 0.6,    // Higher energy
    critical: 0.7,  // Maximum but controlled
  },
  
  /** Phase 4A: Attention decay duration (ms) - energy states return to idle after inactivity */
  ATTENTION_DECAY_DURATION: 8000, // 8 seconds - calibrated to avoid feeling like system powers down while reading
} as const;

/**
 * System DNA Rules (Immutable)
 */
export const SYSTEM_DNA_RULES = {
  /**
   * The system always communicates exactly one dominant posture
   */
  SINGLE_POSTURE: true,
  
  /**
   * Each page has one primary focus; all secondary elements must yield
   */
  PRIMARY_FOCUS: true,
  
  /**
   * State transitions are continuous, time-aware, and contextual
   */
  CONTINUOUS_TRANSITIONS: true,
  
  /**
   * Nothing appears, disappears, or changes abruptly
   */
  NO_ABRUPT_CHANGES: true,
  
  /**
   * Motion exists only to communicate readiness, state change, or continuity
   */
  MOTION_PURPOSE: 'communication',
  
  /**
   * Spatial hierarchy, depth logic, and layout principles are consistent
   */
  SPATIAL_CONSISTENCY: true,
  
  /**
   * Visual restraint is treated as a signal of authority
   */
  VISUAL_RESTRAINT: true,
  
  /**
   * Pink must feel composed, controlled, and intelligent. Never playful. Never decorative.
   */
  PINK_AUTHORITY: true,
  
  /**
   * Tabbed subviews may vary layout density and components, but they must not introduce posture switching behavior.
   * AppShell physiology remains the single source of truth for motion cadence, energy semantics, and spatial discipline across the page.
   * Tabs are content organization, not posture changes.
   */
  TABS_ARE_CONTENT_ORGANIZATION: true,
  
  /**
   * Phase 4C: Idle is a first-class state, not default styling.
   * Silence is intentional absence of signal: no glow, no emphasis, no motion beyond baseline.
   * Secondary, tertiary, and ghost buttons default to idle energy.
   * Primary buttons default to focused energy (they are the primary action).
   * This prevents fatigue and keeps active states powerful.
   */
  IDLE_IS_FIRST_CLASS_STATE: true,
  
  /**
   * Phase 4A: Attention decay - energy states (active, focused) decay back to idle after inactivity.
   * System-driven self-regulation, not animation or UX flourish.
   * Decay is gradual (via CSS transitions), not abrupt.
   * User interaction (mouse enter, focus, click) resets decay naturally.
   * Enforced at component level, not page level.
   * This makes the UI feel self-regulating, not just responsive.
   */
  ATTENTION_DECAY: true,
} as const;

