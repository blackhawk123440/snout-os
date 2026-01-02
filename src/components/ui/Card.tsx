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
}

export const Card: React.FC<CardProps> = ({
  children,
  header,
  footer,
  padding = true,
  depth = 'elevated',
  className = '',
  ...props
}) => {
  const layerStyles = spatial.getLayerStyles(depth);
  
  return (
    <div
      {...props}
      className={className}
      style={{
        backgroundColor: tokens.colors.white.material,
        border: spatial.border(depth, 'subtle'),
        ...layerStyles,
        overflow: 'hidden',
        ...motion.styles('transition', ['box-shadow', 'transform']),
        ...props.style,
      }}
    >
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
