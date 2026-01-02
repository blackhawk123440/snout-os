/**
 * Posture Provider - Control Surface
 * 
 * Posture controls motion intensity, contrast, and voltage intensity.
 * First-class system concept that changes whole surface behavior.
 */

'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { controlSurface } from '@/lib/design-tokens-control-surface';

export type Posture = 'observational' | 'analytical' | 'configuration' | 'operational' | 'critical';

export interface PostureConfig {
  // Motion intensity (ambient, restrained, continuous)
  motionIntensity: 'calm' | 'moderate' | 'tight' | 'still' | 'paused';
  motionSpeed: 'slow' | 'base' | 'fast' | 'minimal' | 'tight';
  
  // Contrast levels
  contrast: 'relaxed' | 'moderate' | 'high' | 'maximum' | 'heightened';
  
  // Voltage intensity (pink energy flow)
  voltageIntensity: 'subtle' | 'moderate' | 'active' | 'minimal' | 'intense';
  
  // Layout density
  layoutDensity: 'relaxed' | 'moderate' | 'dense';
  
  // Spacing
  spacing: 'wide' | 'moderate' | 'tight';
  
  // Ambient motion enabled/disabled
  ambientMotionEnabled: boolean;
}

const postureConfigs: Record<Posture, PostureConfig> = {
  observational: {
    motionIntensity: 'calm',
    motionSpeed: 'slow',
    contrast: 'relaxed',
    voltageIntensity: 'subtle',
    layoutDensity: 'relaxed',
    spacing: 'wide',
    ambientMotionEnabled: true,
  },
  analytical: {
    motionIntensity: 'moderate',
    motionSpeed: 'base',
    contrast: 'moderate',
    voltageIntensity: 'moderate',
    layoutDensity: 'moderate',
    spacing: 'moderate',
    ambientMotionEnabled: true,
  },
  configuration: {
    motionIntensity: 'still',
    motionSpeed: 'minimal',
    contrast: 'maximum',
    voltageIntensity: 'minimal',
    layoutDensity: 'dense',
    spacing: 'tight',
    ambientMotionEnabled: false,
  },
  operational: {
    motionIntensity: 'moderate',
    motionSpeed: 'base',
    contrast: 'moderate',
    voltageIntensity: 'active',
    layoutDensity: 'moderate',
    spacing: 'moderate',
    ambientMotionEnabled: true,
  },
  critical: {
    motionIntensity: 'tight',
    motionSpeed: 'tight',
    contrast: 'heightened',
    voltageIntensity: 'intense',
    layoutDensity: 'moderate',
    spacing: 'moderate',
    ambientMotionEnabled: false, // Pauses ambient motion
  },
};

export interface PostureContextValue {
  posture: Posture;
  setPosture: (posture: Posture) => void;
  config: PostureConfig;
}

const PostureContext = createContext<PostureContextValue | undefined>(undefined);

export interface PostureProviderProps {
  children: ReactNode;
  defaultPosture?: Posture;
}

export const PostureProvider: React.FC<PostureProviderProps> = ({
  children,
  defaultPosture = 'observational',
}) => {
  const [posture, setPosture] = useState<Posture>(defaultPosture);
  const config = postureConfigs[posture];

  return (
    <PostureContext.Provider value={{ posture, setPosture, config }}>
      {children}
    </PostureContext.Provider>
  );
};

export const usePosture = (): PostureContextValue => {
  const context = useContext(PostureContext);
  if (!context) {
    throw new Error('usePosture must be used within PostureProvider');
  }
  return context;
};

// Helper to get motion duration based on posture
export const getMotionDuration = (posture: Posture, baseDuration: string): string => {
  const config = postureConfigs[posture];
  const multipliers: Record<string, number> = {
    slow: 1.6,
    base: 1.0,
    fast: 0.8,
    minimal: 0.5,
    tight: 0.7,
  };
  
  const multiplier = multipliers[config.motionSpeed] || 1.0;
  const baseMs = parseFloat(baseDuration);
  return `${baseMs * multiplier}ms`;
};

// Helper to get voltage intensity multiplier
export const getVoltageIntensity = (posture: Posture): number => {
  const config = postureConfigs[posture];
  const multipliers: Record<string, number> = {
    subtle: 0.5,
    moderate: 1.0,
    active: 1.3,
    minimal: 0.3,
    intense: 1.8,
  };
  return multipliers[config.voltageIntensity] || 1.0;
};

// Helper to get spacing based on posture
export const getPostureSpacing = (posture: Posture): 'tight' | 'moderate' | 'wide' => {
  return postureConfigs[posture].spacing;
};

