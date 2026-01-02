/**
 * Card Component - System DNA Implementation
 * 
 * Content container with spatial depth and hierarchy.
 * Cards exist in depth - elevation and shadows create spatial separation.
 * Motion is subtle and continuous.
 */

import React from 'react';
import { tokens } from '@/lib/design-tokens';
import { DepthLayer } from '@/lib/system-dna';
import { spatial } from '@/lib/spatial-hierarchy';
import { motion } from '@/lib/motion-system';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  padding?: boolean;
  /** Depth layer - determines elevation and shadow */
  depth?: DepthLayer;
  /** Phase 5B: Apply glass material styling (for key modules/KPI cards only) */
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  header,
  footer,
  padding = true,
  depth = 'elevated',
  glass = false,
  className = '',
  ...props
}) => {
  const layerStyles = spatial.getLayerStyles(depth);
  const cardClassName = glass ? `glass-panel ${className}` : className;
  
  // Glass styling overrides standard styling
  const cardStyle = glass
    ? {
        // Glass panel CSS class handles most styling
        borderRadius: tokens.borderRadius.lg,
        ...motion.styles('transition', ['box-shadow', 'transform']),
        ...props.style,
      }
    : {
        backgroundColor: tokens.colors.white.material,
        border: spatial.border(depth, 'subtle'),
        ...layerStyles,
        overflow: 'hidden',
        ...motion.styles('transition', ['box-shadow', 'transform']),
        ...props.style,
      };
  
  return (
    <div
      {...props}
      className={cardClassName}
      style={cardStyle}
    >
      {glass && <div className="glass-panel-sheen" />}
      {header && (
        <div
          style={{
            padding: padding ? `${tokens.spacing[4]} ${tokens.spacing[4]} ${tokens.spacing[3]}` : 0,
            borderBottom: header ? spatial.border(depth, 'subtle') : 'none',
          }}
        >
          {header}
        </div>
      )}
      <div
        style={{
          padding: padding ? tokens.spacing[4] : 0,
        }}
      >
        {children}
      </div>
      {footer && (
        <div
          style={{
            padding: padding ? `${tokens.spacing[3]} ${tokens.spacing[4]} ${tokens.spacing[4]}` : 0,
            borderTop: footer ? spatial.border(depth, 'subtle') : 'none',
            backgroundColor: tokens.colors.background.secondary,
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
};
