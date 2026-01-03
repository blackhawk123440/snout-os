'use client';

import { useEffect, useState } from 'react';

/**
 * Cursor glow effect - subtle pink glow that follows cursor
 * Enterprise restrained - very subtle, respects reduced motion
 */
export function CursorGlow() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  if (!isVisible) return null;

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(0, 255, 255, 0.15) 0%, rgba(138, 43, 226, 0.08) 40%, transparent 70%)`,
        pointerEvents: 'none',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        transition: 'opacity 0.2s ease',
        mixBlendMode: 'screen',
        filter: 'blur(20px)',
      }}
    />
  );
}

