/**
 * Motion System
 * 
 * Motion communicates intelligence and readiness only.
 * Ambient, restrained, and continuous.
 * Must never draw attention to itself.
 */

import { MotionIntent, SYSTEM_CONSTANTS, PagePhysiology } from './system-dna';
import { tokens } from './design-tokens';

/**
 * Motion Configuration
 */
export interface MotionConfig {
  duration: string;
  timingFunction: string;
  delay?: string;
}

/**
 * Get motion configuration for intent
 */
export function getMotionConfig(intent: MotionIntent): MotionConfig {
  return {
    duration: SYSTEM_CONSTANTS.MOTION_DURATIONS[intent] + 'ms',
    timingFunction: SYSTEM_CONSTANTS.MOTION_CURVES[intent],
  };
}

/**
 * Get motion configuration for page physiology
 * Each physiology has appropriate motion characteristics
 */
export function getPhysiologyMotion(physiology: PagePhysiology): MotionConfig {
  const configs: Record<PagePhysiology, MotionConfig> = {
    observational: {
      duration: '2000ms', // Slow, calm
      timingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
    
    analytical: {
      duration: '300ms', // Responsive
      timingFunction: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    },
    
    configuration: {
      duration: '200ms', // Minimal, stable
      timingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
    
    operational: {
      duration: '150ms', // Quick but not abrupt
      timingFunction: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    },
    
    critical: {
      duration: '200ms', // Controlled urgency
      timingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
    },
  };
  
  return configs[physiology];
}

/**
 * Motion utilities for common transitions
 */
export const motion = {
  /**
   * Get CSS transition string for property
   */
  transition(
    property: string | string[],
    intent: MotionIntent = 'transition',
    delay: number = 0
  ): string {
    const config = getMotionConfig(intent);
    const properties = Array.isArray(property) ? property.join(', ') : property;
    const delayStr = delay > 0 ? ` ${delay}ms` : '';
    
    return `${properties} ${config.duration} ${config.timingFunction}${delayStr}`;
  },
  
  /**
   * Get CSS transition for common properties
   */
  common(intent: MotionIntent = 'transition'): string {
    return motion.transition(
      ['opacity', 'transform', 'box-shadow', 'background-color', 'border-color'],
      intent
    );
  },
  
  /**
   * Get CSS transition for opacity changes
   */
  opacity(intent: MotionIntent = 'transition'): string {
    return motion.transition('opacity', intent);
  },
  
  /**
   * Get CSS transition for transform changes
   */
  transform(intent: MotionIntent = 'transition'): string {
    return motion.transition('transform', intent);
  },
  
  /**
   * Get CSS transition for color changes
   */
  color(intent: MotionIntent = 'transition'): string {
    return motion.transition(
      ['background-color', 'border-color', 'color'],
      intent
    );
  },
  
  /**
   * Get CSS animation for ambient breathing effect
   * Subtle, continuous, barely noticeable
   */
  ambient(): string {
    return `
      @keyframes breathe {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.98; }
      }
      animation: breathe ${SYSTEM_CONSTANTS.MOTION_DURATIONS.ambient}ms ${SYSTEM_CONSTANTS.MOTION_CURVES.ambient} infinite;
    `;
  },
  
  /**
   * Get motion styles object for React
   */
  styles(intent: MotionIntent = 'transition', properties?: string[]): React.CSSProperties {
    const config = getMotionConfig(intent);
    const propsToTransition = properties || ['opacity', 'transform'];
    
    return {
      transition: `${propsToTransition.join(', ')} ${config.duration} ${config.timingFunction}`,
    } as React.CSSProperties;
  },
};

/**
 * CSS-in-JS helper for motion
 */
export function getMotionStyles(
  intent: MotionIntent = 'transition',
  properties?: string[]
): React.CSSProperties {
  return motion.styles(intent, properties);
}

