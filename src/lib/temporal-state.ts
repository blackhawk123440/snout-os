/**
 * Temporal State Management
 * 
 * The system is time-aware, not event-driven.
 * States ramp up and down gradually.
 * No hard resets, dead states, or sudden transitions.
 */

import { SYSTEM_CONSTANTS } from './system-dna';

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
 * Create a new temporal state
 */
export function createTemporalState(initialValue: number = 0): TemporalState {
  return {
    value: initialValue,
    target: initialValue,
    velocity: 0,
    lastUpdate: Date.now(),
  };
}

/**
 * Update temporal state towards target
 * Uses smooth easing for continuous, natural transitions
 */
export function updateTemporalState(state: TemporalState, now: number = Date.now()): TemporalState {
  const deltaTime = now - state.lastUpdate;
  
  if (deltaTime <= 0) {
    return state;
  }
  
  const difference = state.target - state.value;
  const distance = Math.abs(difference);
  
  // If already at target (within threshold), return as-is
  if (distance < 0.001) {
    return {
      ...state,
      value: state.target,
      velocity: 0,
      lastUpdate: now,
    };
  }
  
  // Smooth interpolation using exponential easing
  // Higher smoothing factor = smoother but slower
  const smoothing = SYSTEM_CONSTANTS.TEMPORAL_SMOOTHING;
  const factor = 1 - Math.pow(1 - smoothing, deltaTime / SYSTEM_CONSTANTS.TEMPORAL_UPDATE_RATE);
  
  const newValue = state.value + difference * factor;
  const newVelocity = (newValue - state.value) / deltaTime;
  
  return {
    value: newValue,
    target: state.target,
    velocity: newVelocity,
    lastUpdate: now,
  };
}

/**
 * Set temporal state target
 * State will smoothly transition towards this target
 */
export function setTemporalTarget(
  state: TemporalState,
  target: number,
  now: number = Date.now()
): TemporalState {
  // Clamp target to valid range
  const clampedTarget = Math.max(0, Math.min(1, target));
  
  return {
    ...state,
    target: clampedTarget,
    lastUpdate: now,
  };
}

/**
 * Set temporal state immediately (no transition)
 * Use sparingly - breaks continuity
 */
export function setTemporalStateImmediate(
  state: TemporalState,
  value: number,
  now: number = Date.now()
): TemporalState {
  const clampedValue = Math.max(0, Math.min(1, value));
  
  return {
    value: clampedValue,
    target: clampedValue,
    velocity: 0,
    lastUpdate: now,
  };
}

/**
 * React hook for temporal state management
 */
import { useState, useEffect, useRef, useCallback } from 'react';

export function useTemporalState(initialValue: number = 0) {
  const [state, setState] = useState<TemporalState>(() => createTemporalState(initialValue));
  const animationFrameRef = useRef<number>();
  const lastUpdateRef = useRef<number>(Date.now());
  
  // Update state towards target
  useEffect(() => {
    let running = true;
    
    const update = () => {
      if (!running) return;
      
      const now = Date.now();
      setState((prevState) => {
        const updated = updateTemporalState(prevState, now);
        lastUpdateRef.current = now;
        return updated;
      });
      
      animationFrameRef.current = requestAnimationFrame(update);
    };
    
    animationFrameRef.current = requestAnimationFrame(update);
    
    return () => {
      running = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
  const setTarget = useCallback((target: number) => {
    setState((prevState) => setTemporalTarget(prevState, target));
  }, []);
  
  const setImmediate = useCallback((value: number) => {
    setState((prevState) => setTemporalStateImmediate(prevState, value));
  }, []);
  
  return {
    value: state.value,
    target: state.target,
    velocity: state.velocity,
    setTarget,
    setImmediate,
  };
}

/**
 * Calculate transition duration based on distance
 * Longer distances take longer, but within min/max bounds
 */
export function calculateTransitionDuration(
  from: number,
  to: number,
  minDuration: number = SYSTEM_CONSTANTS.TEMPORAL_MIN_DURATION,
  maxDuration: number = SYSTEM_CONSTANTS.TEMPORAL_MAX_DURATION
): number {
  const distance = Math.abs(to - from);
  const normalizedDistance = Math.min(1, distance); // Clamp to 0-1 range
  
  // Linear interpolation between min and max based on distance
  const duration = minDuration + (maxDuration - minDuration) * normalizedDistance;
  
  return Math.round(duration);
}

