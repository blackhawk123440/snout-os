/**
 * Input Component - Control Surface
 * 
 * Input focus feels like voltage routing to the field.
 * Feels intelligent and present, not generic form UI.
 */

import React, { useState } from 'react';
import { controlSurface } from '@/lib/design-tokens-control-surface';
import { usePosture, getMotionDuration, getVoltageIntensity } from './PostureProvider';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  size = 'md',
  style,
  ...props
}) => {
  const { config, posture } = usePosture();
  const [focused, setFocused] = useState(false);
  const motionDuration = getMotionDuration(posture, controlSurface.motion.duration.fast);
  const voltageMultiplier = getVoltageIntensity(posture);

  // Size styles
  const sizeStyles = {
    sm: {
      padding: `${controlSurface.spacing[2]} ${controlSurface.spacing[3]}`,
      fontSize: controlSurface.typography.fontSize.sm[0] as string,
    },
    md: {
      padding: `${controlSurface.spacing[3]} ${controlSurface.spacing[4]}`,
      fontSize: controlSurface.typography.fontSize.base[0] as string,
    },
    lg: {
      padding: `${controlSurface.spacing[4]} ${controlSurface.spacing[5]}`,
      fontSize: controlSurface.typography.fontSize.lg[0] as string,
    },
  };

  // Voltage routing effect: stronger when focused
  const voltageIntensity = focused
    ? controlSurface.colors.voltage.focus
    : controlSurface.colors.voltage.edge;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: controlSurface.spacing[2] }}>
      {label && (
        <label
          style={{
            fontSize: controlSurface.typography.fontSize.sm[0] as string,
            fontWeight: controlSurface.typography.fontWeight.medium,
            color: controlSurface.colors.base.neutral.primary,
            letterSpacing: '0.01em',
          }}
        >
          {label}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {leftIcon && (
          <div
            style={{
              position: 'absolute',
              left: controlSurface.spacing[4],
              color: controlSurface.colors.base.neutral.tertiary,
              fontSize: controlSurface.typography.fontSize.base[0] as string,
              zIndex: 1,
              pointerEvents: 'none',
            }}
          >
            {leftIcon}
          </div>
        )}

        <input
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={{
            width: '100%',
            ...sizeStyles[size],
            backgroundColor: controlSurface.colors.base.depth1,
            color: controlSurface.colors.base.neutral.primary,
            border: focused
              ? controlSurface.spatial.border.focus
              : error
                ? `1px solid ${controlSurface.colors.status.error.base}`
                : controlSurface.spatial.border.base,
            borderRadius: controlSurface.spatial.radius.base,
            fontFamily: controlSurface.typography.fontFamily.sans.join(', '),
            outline: 'none',
            transition: `all ${motionDuration} ${controlSurface.motion.easing.responsive}`,
            boxShadow: focused
              ? `0 0 0 2px ${voltageIntensity}, ${controlSurface.spatial.elevation.panel}`
              : 'none',
            paddingLeft: leftIcon ? `calc(${controlSurface.spacing[4]} + 1.5rem + ${controlSurface.spacing[2]})` : sizeStyles[size].padding.split(' ')[1],
            paddingRight: rightIcon ? `calc(${controlSurface.spacing[4]} + 1.5rem + ${controlSurface.spacing[2]})` : sizeStyles[size].padding.split(' ')[1],
            ...style,
          }}
        />

        {rightIcon && (
          <div
            style={{
              position: 'absolute',
              right: controlSurface.spacing[4],
              color: controlSurface.colors.base.neutral.tertiary,
              fontSize: controlSurface.typography.fontSize.base[0] as string,
              zIndex: 1,
              pointerEvents: 'none',
            }}
          >
            {rightIcon}
          </div>
        )}
      </div>

      {(error || helperText) && (
        <div
          style={{
            fontSize: controlSurface.typography.fontSize.xs[0] as string,
            color: error ? controlSurface.colors.status.error.base : controlSurface.colors.base.neutral.tertiary,
            lineHeight: (controlSurface.typography.fontSize.xs[1] as { lineHeight: string }).lineHeight,
          }}
        >
          {error || helperText}
        </div>
      )}
    </div>
  );
};

