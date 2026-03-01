'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark';
export type UIDensity = 'compact' | 'comfortable' | 'spacious';

interface ThemeContextValue {
  mode: ThemeMode;
  density: UIDensity;
  setMode: (m: ThemeMode) => void;
  setDensity: (d: UIDensity) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEYS = { mode: 'snout-theme-mode', density: 'snout-ui-density' } as const;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [density, setDensityState] = useState<UIDensity>('comfortable');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.mode) as ThemeMode | null;
      const d = localStorage.getItem(STORAGE_KEYS.density) as UIDensity | null;
      if (stored === 'dark' || stored === 'light') setModeState(stored);
      else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setModeState('dark');
      if (d === 'compact' || d === 'comfortable' || d === 'spacious') setDensityState(d);
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle('dark', mode === 'dark');
    try {
      localStorage.setItem(STORAGE_KEYS.mode, mode);
    } catch {
      // ignore
    }
  }, [mode, mounted]);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute('data-density', density);
  }, [density, mounted]);

  const setMode = useCallback((m: ThemeMode) => setModeState(m), []);
  const setDensity = useCallback((d: UIDensity) => {
    setDensityState(d);
    try {
      localStorage.setItem(STORAGE_KEYS.density, d);
    } catch {
      // ignore
    }
  }, []);

  const toggleMode = useCallback(() => setModeState((p) => (p === 'light' ? 'dark' : 'light')), []);

  return (
    <ThemeContext.Provider
      value={{
        mode,
        density,
        setMode,
        setDensity,
        toggleMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  return ctx ?? {
    mode: 'light' as ThemeMode,
    density: 'comfortable' as UIDensity,
    setMode: () => {},
    setDensity: () => {},
    toggleMode: () => {},
  };
}
