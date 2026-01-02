/**
 * Panel Component - Control Surface
 * 
 * Spatial depth foundation. Panels feel anchored in space.
 * Hierarchy through position and depth, not flat layers.
 */

import React from 'react';
import { controlSurface } from '@/lib/design-tokens-control-surface';

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Depth level: base, elevated, floating
   * Controls shadow, background, and spatial presence
   */
  depth?: 'base' | 'elevated' | 'floating';
  
  /**
   * Voltage level: ambient glow intensity
   * Controls subtle pink energy flow
   */
  voltage?: 'none' | 'ambient' | 'edge' | 'focus';
  
  /**
   * Border emphasis
   */
  border?: 'none' | 'subtle' | 'base' | 'voltage';
  
  /**
   * Posture-specific spacing (inherited from page context)
   */
  spacing?: 'tight' | 'moderate' | 'wide';
  
  children: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({
  depth = 'base',
  voltage = 'ambient',
  border = 'base',
  spacing = 'moderate',
  children,
  style,
  ...props
}) => {
  // Depth determines background and shadow
  const depthStyles = {
    base: {
      backgroundColor: controlSurface.colors.base.depth1,
      boxShadow: controlSurface.spatial.elevation.panel,
    },
    elevated: {
      backgroundColor: controlSurface.colors.base.depth2,
      boxShadow: controlSurface.spatial.elevation.elevated,
    },
    floating: {
      backgroundColor: controlSurface.colors.base.depth2,
      boxShadow: controlSurface.spatial.elevation.floating,
    },
  };

  // Voltage adds pink energy flow
  const voltageStyles = {
    none: {},
    ambient: {
      // Subtle ambient glow - use box-shadow inset for glow effect
      boxShadow: `inset 0 0 0 1px ${controlSurface.colors.voltage.ambient}, ${depthStyles[depth].boxShadow}`,
    },
    edge: {
      borderColor: controlSurface.colors.voltage.edge,
      boxShadow: `0 0 0 1px ${controlSurface.colors.voltage.edge}, ${depthStyles[depth].boxShadow}`,
    },
    focus: {
      borderColor: controlSurface.colors.voltage.focus,
      boxShadow: `0 0 0 1px ${controlSurface.colors.voltage.focus}, ${depthStyles[depth].boxShadow}`,
    },
  };

  // Border system
  const borderStyles = {
    none: { border: 'none' },
    subtle: { border: controlSurface.spatial.border.subtle },
    base: { border: controlSurface.spatial.border.base },
    voltage: { border: controlSurface.spatial.border.voltage },
  };

  // Spacing rhythm
  const spacingMap = {
    tight: controlSurface.spacing[4],
    moderate: controlSurface.spacing[6],
    wide: controlSurface.spacing[8],
  };

  // Combine styles properly
  const combinedStyle: React.CSSProperties = {
    ...depthStyles[depth],
    borderRadius: controlSurface.spatial.radius.medium,
    padding: spacingMap[spacing],
    transition: `all ${controlSurface.motion.duration.base} ${controlSurface.motion.easing.ambient}`,
    ...(border !== 'none' ? borderStyles[border] : {}),
    ...(voltage !== 'none' ? voltageStyles[voltage] : {}),
    ...style,
  };

  return (
    <div style={combinedStyle} {...props}>
      {children}
    </div>
  );
};

