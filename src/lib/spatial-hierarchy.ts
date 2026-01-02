/**
 * Spatial Hierarchy and Depth Logic
 * 
 * The interface exists in depth, not flat layers.
 * Panels are spatially anchored.
 * Hierarchy is conveyed through position, depth, and spacing.
 */

import { DepthLayer, SYSTEM_CONSTANTS } from './system-dna';
import { tokens } from './design-tokens';

/**
 * Spatial Depth Configuration
 */
export interface SpatialConfig {
  /** Depth layer */
  layer: DepthLayer;
  /** Z-index offset */
  zIndex: number;
  /** Shadow for depth */
  shadow: string;
  /** Border for separation (if needed) */
  border?: string;
  /** Background opacity for glass-like materials */
  backgroundOpacity?: number;
}

/**
 * Get spatial configuration for a depth layer
 */
export function getSpatialConfig(layer: DepthLayer): SpatialConfig {
  const configs: Record<DepthLayer, SpatialConfig> = {
    base: {
      layer: 'base',
      zIndex: tokens.zIndex.base,
      shadow: tokens.shadows.none,
    },
    
    surface: {
      layer: 'surface',
      zIndex: tokens.zIndex.surface,
      shadow: tokens.shadows.surface,
    },
    
    elevated: {
      layer: 'elevated',
      zIndex: tokens.zIndex.elevated,
      shadow: tokens.shadows.elevated,
    },
    
    overlay: {
      layer: 'overlay',
      zIndex: tokens.zIndex.overlay,
      shadow: tokens.shadows.overlay,
      backgroundOpacity: 0.95, // Slightly transparent for depth
    },
    
    critical: {
      layer: 'critical',
      zIndex: tokens.zIndex.critical,
      shadow: tokens.shadows.critical,
      backgroundOpacity: 0.98, // More opaque for authority
    },
  };
  
  return configs[layer];
}

/**
 * Get spacing for spatial hierarchy
 * Closer elements have tighter spacing, distant elements have more
 */
export function getHierarchySpacing(level: 'tight' | 'normal' | 'loose' = 'normal'): string {
  const spacingMap = {
    tight: tokens.spacing[2],   // 8px - close, related elements
    normal: tokens.spacing[4],  // 16px - standard spacing
    loose: tokens.spacing[6],   // 24px - separated, distinct sections
  };
  
  return spacingMap[level];
}

/**
 * Get border radius based on depth
 * Surfaces have subtle radius, elevated elements have more
 */
export function getHierarchyRadius(layer: DepthLayer): string {
  const radiusMap: Record<DepthLayer, string> = {
    base: tokens.borderRadius.none,
    surface: tokens.borderRadius.sm,
    elevated: tokens.borderRadius.DEFAULT,
    overlay: tokens.borderRadius.lg,
    critical: tokens.borderRadius.xl,
  };
  
  return radiusMap[layer];
}

/**
 * Spatial positioning utilities
 */
export const spatial = {
  /**
   * Get styles for a depth layer
   */
  getLayerStyles(layer: DepthLayer): React.CSSProperties {
    const config = getSpatialConfig(layer);
    
    return {
      position: 'relative' as const,
      zIndex: config.zIndex,
      boxShadow: config.shadow,
      borderRadius: getHierarchyRadius(layer),
      ...(config.backgroundOpacity !== undefined && {
        backgroundColor: `rgba(255, 255, 255, ${config.backgroundOpacity})`,
      }),
    };
  },
  
  /**
   * Get spacing between elements in hierarchy
   */
  spacing(level: 'tight' | 'normal' | 'loose' = 'normal'): string {
    return getHierarchySpacing(level);
  },
  
  /**
   * Get border for separation (subtle, spatial)
   */
  border(layer: DepthLayer, strength: 'subtle' | 'normal' | 'strong' = 'normal'): string {
    if (layer === 'base') return 'none';
    
    const borderMap = {
      subtle: `1px solid ${tokens.colors.border.muted}`,
      normal: `1px solid ${tokens.colors.border.default}`,
      strong: `1px solid ${tokens.colors.border.strong}`,
    };
    
    return borderMap[strength];
  },
};

