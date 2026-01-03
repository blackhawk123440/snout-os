/**
 * Button Component - System DNA Implementation
 * 
 * Enterprise button with energy levels and temporal intelligence.
 * Color behaves as energy - pink intensity increases for focus/readiness.
 * Motion communicates readiness, not decoration.
 */

import React, { useState, useEffect, useRef } from 'react';
import { tokens } from '@/lib/design-tokens';
import { EnergyLevel, SYSTEM_CONSTANTS } from '@/lib/system-dna';
import { motion } from '@/lib/motion-system';
import { spatial } from '@/lib/spatial-hierarchy';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  /** Energy level - affects pink intensity (primary variant only) */
  energy?: EnergyLevel;
}

/**
 * Get default energy level for a button variant
 * Phase 4C: Idle is the default for non-primary buttons (silence state)
 * Primary buttons default to focused (they are the primary action)
 */
const getDefaultEnergy = (variant: ButtonVariant): EnergyLevel => {
  if (variant === 'primary' || variant === 'danger') {
    return 'focused'; // Primary actions use focused by default
  }
  return 'idle'; // Secondary, tertiary, ghost use idle (silence state)
};

const getVariantStyles = (variant: ButtonVariant, energy: EnergyLevel) => {
  const styles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      backgroundColor: tokens.colors.primary[energy],
      color: tokens.colors.white.material,
      border: `1px solid ${tokens.colors.primary[energy]}`,
    },
    secondary: {
      backgroundColor: tokens.colors.white.material,
      color: tokens.colors.text.primary,
      border: spatial.border('surface', 'normal'),
    },
    tertiary: {
      backgroundColor: 'transparent',
      color: tokens.colors.text.primary,
      border: '1px solid transparent',
    },
    danger: {
      backgroundColor: tokens.colors.error.DEFAULT,
      color: tokens.colors.white.material,
      border: `1px solid ${tokens.colors.error.DEFAULT}`,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: tokens.colors.text.secondary,
      border: '1px solid transparent',
    },
  };
  return styles[variant];
};

const getHoverStyles = (variant: ButtonVariant, energy: EnergyLevel = 'focused') => {
  const styles: Record<ButtonVariant, { backgroundColor?: string; color?: string; borderColor?: string }> = {
    primary: {
      backgroundColor: tokens.colors.primary.active, // Increase energy on hover
      borderColor: tokens.colors.primary.active,
    },
    secondary: {
      backgroundColor: tokens.colors.primary.opacity[5],
    },
    tertiary: {
      backgroundColor: tokens.colors.primary.opacity[5],
    },
    danger: {
      backgroundColor: tokens.colors.error[600],
      borderColor: tokens.colors.error[600],
    },
    ghost: {
      backgroundColor: tokens.colors.primary.opacity[5],
      color: tokens.colors.text.primary,
    },
  };
  return styles[variant];
};

const getSizeStyles = (size: ButtonSize) => {
  const sizes: Record<ButtonSize, { padding: string; fontSize: string; height: string }> = {
    sm: {
      padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
      fontSize: tokens.typography.fontSize.sm[0],
      height: '2rem',
    },
    md: {
      padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
      fontSize: tokens.typography.fontSize.base[0],
      height: '2.5rem',
    },
    lg: {
      padding: `${tokens.spacing[4]} ${tokens.spacing[6]}`,
      fontSize: tokens.typography.fontSize.lg[0],
      height: '3rem',
    },
  };
  return sizes[size];
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      energy, // Explicitly passed or undefined (will use default)
      className = '',
      onMouseEnter,
      onMouseLeave,
      onFocus,
      onClick,
      ...props
    },
    ref
  ) => {
    // Phase 4C: Idle is default for non-primary buttons (silence state)
    // Primary buttons default to focused. System enforces this, not page logic.
    const initialEnergy = energy ?? getDefaultEnergy(variant);
    const isDisabled = disabled || isLoading;
    
    // Phase 4A: Attention Decay - energy states (active, focused) decay back to idle after inactivity
    // Only applies to primary variant buttons with active/focused energy
    const shouldDecay = variant === 'primary' && (initialEnergy === 'active' || initialEnergy === 'focused');
    const [decayedEnergy, setDecayedEnergy] = useState<EnergyLevel>(initialEnergy);
    const lastInteractionRef = useRef<number>(Date.now());
    const decayTimerRef = useRef<NodeJS.Timeout | null>(null);
    
    // Phase 4A: Reset decay timer on interaction (mouse enter, focus, click)
    const resetDecay = () => {
      lastInteractionRef.current = Date.now();
      setDecayedEnergy(initialEnergy);
      if (decayTimerRef.current) {
        clearTimeout(decayTimerRef.current);
        decayTimerRef.current = null;
      }
    };
    
    // Phase 4A: Reset decay state when initialEnergy changes
    useEffect(() => {
      setDecayedEnergy(initialEnergy);
      lastInteractionRef.current = Date.now();
      if (decayTimerRef.current) {
        clearTimeout(decayTimerRef.current);
        decayTimerRef.current = null;
      }
    }, [initialEnergy]);
    
    // Phase 4A: Set up decay timer
    useEffect(() => {
      if (!shouldDecay || isDisabled || isLoading) {
        return;
      }
      
      const checkDecay = () => {
        const timeSinceInteraction = Date.now() - lastInteractionRef.current;
        if (timeSinceInteraction >= SYSTEM_CONSTANTS.ATTENTION_DECAY_DURATION) {
          setDecayedEnergy('idle');
        } else {
          decayTimerRef.current = setTimeout(checkDecay, 100); // Check every 100ms
        }
      };
      
      // Initial timer setup
      decayTimerRef.current = setTimeout(checkDecay, SYSTEM_CONSTANTS.ATTENTION_DECAY_DURATION);
      
      return () => {
        if (decayTimerRef.current) {
          clearTimeout(decayTimerRef.current);
        }
      };
    }, [shouldDecay, isDisabled, isLoading, initialEnergy]);
    
    // Use decayed energy for display (only for primary buttons with active/focused)
    const effectiveEnergy = shouldDecay ? decayedEnergy : initialEnergy;
    
    const sizeStyle = getSizeStyles(size);
    const variantStyle = getVariantStyles(variant, effectiveEnergy);
    const hoverStyle = getHoverStyles(variant, effectiveEnergy);
    
    // Brand colors as light behavior: Pink glow (0.06-0.08 opacity max), brown focus ring
    const lightEmission = variant === 'primary' && (effectiveEnergy === 'focused' || effectiveEnergy === 'active')
      ? {
          boxShadow: `0 0 16px 0 rgba(252, 225, 239, 0.07), 0 0 8px 0 rgba(252, 225, 239, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 0.30)`,
          outline: `2px solid rgba(67, 47, 33, 0.40)`, /* Brown focus ring for authority */
          outlineOffset: '2px',
        }
      : {};

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!isDisabled) {
        // Phase 4A: Reset decay on interaction
        resetDecay();
        
        if (hoverStyle.backgroundColor) {
          e.currentTarget.style.backgroundColor = hoverStyle.backgroundColor;
          if (hoverStyle.borderColor) {
            e.currentTarget.style.borderColor = hoverStyle.borderColor;
          }
          if (hoverStyle.color) {
            e.currentTarget.style.color = hoverStyle.color;
          }
        }
      }
      onMouseEnter?.(e);
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!isDisabled) {
        e.currentTarget.style.backgroundColor = variantStyle.backgroundColor as string;
        e.currentTarget.style.borderColor = variantStyle.border as string;
        e.currentTarget.style.color = variantStyle.color as string;
      }
      onMouseLeave?.(e);
    };
    
    const handleFocus = (e: React.FocusEvent<HTMLButtonElement>) => {
      // Phase 4A: Reset decay on interaction
      if (!isDisabled) {
        resetDecay();
      }
      onFocus?.(e);
    };
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Phase 4A: Reset decay on interaction
      if (!isDisabled) {
        resetDecay();
      }
      onClick?.(e);
    };

    // Phase 5B: Show refraction ring for focused/active energy states
    const showRefractionRing = !isDisabled && (effectiveEnergy === 'focused' || effectiveEnergy === 'active');
    
    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={className}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: tokens.spacing[2],
          borderRadius: tokens.borderRadius.md,
          fontWeight: tokens.typography.fontWeight.medium,
          fontFamily: tokens.typography.fontFamily.sans.join(', '),
          height: sizeStyle.height,
          padding: sizeStyle.padding,
          fontSize: sizeStyle.fontSize,
          lineHeight: '1',
          ...variantStyle,
          ...lightEmission,
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: isDisabled ? 0.5 : 1,
          ...motion.styles('readiness', ['background-color', 'border-color', 'color']),
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onClick={handleClick}
        {...props}
      >
        {/* Phase 5B: Refraction ring for focused/active states */}
        {showRefractionRing && (
          <div
            className="button-refraction-ring active"
            style={{
              position: 'absolute',
              inset: '-2px',
              borderRadius: tokens.borderRadius.md,
            }}
          />
        )}
        {isLoading && (
          <span
            style={{
              display: 'inline-block',
              width: '1em',
              height: '1em',
              border: `2px solid currentColor`,
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }}
            aria-hidden="true"
          />
        )}
        {!isLoading && leftIcon && <span style={{ position: 'relative', zIndex: 1 }}>{leftIcon}</span>}
        <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
        {!isLoading && rightIcon && <span style={{ position: 'relative', zIndex: 1 }}>{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
