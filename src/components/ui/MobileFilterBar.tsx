/**
 * MobileFilterBar Component
 * 
 * Standardized horizontal scrolling filter bar for mobile-first filter UI.
 * Part C: Prevents smashed filter bars by using proper spacing and horizontal scroll.
 */

'use client';

import React from 'react';
import { tokens } from '@/lib/design-tokens';
import { useMobile } from '@/lib/use-mobile';

export interface FilterOption {
  id: string;
  label: string;
  badge?: number;
  disabled?: boolean;
}

export interface MobileFilterBarProps {
  options: FilterOption[];
  activeFilter: string;
  onFilterChange: (filterId: string) => void;
  sticky?: boolean;
}

export const MobileFilterBar: React.FC<MobileFilterBarProps> = ({
  options,
  activeFilter,
  onFilterChange,
  sticky = false,
}) => {
  const isMobile = useMobile();

  return (
    <div
      style={{
        position: sticky ? 'sticky' : 'relative',
        top: sticky ? 0 : 'auto',
        zIndex: sticky ? tokens.zIndex.sticky : 'auto',
        backgroundColor: tokens.colors.background.primary,
        borderBottom: `1px solid ${tokens.colors.border.default}`,
        paddingTop: tokens.spacing[3],
        paddingBottom: tokens.spacing[3],
        paddingLeft: tokens.spacing[6],
        paddingRight: tokens.spacing[6],
        marginLeft: `-${tokens.spacing[6]}`,
        marginRight: `-${tokens.spacing[6]}`,
        marginBottom: tokens.spacing[4],
        width: `calc(100% + ${parseInt(tokens.spacing[6]) * 2}px)`,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: tokens.spacing[2],
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin',
          paddingBottom: '2px', // Space for scrollbar
          // Hide scrollbar on mobile while keeping scroll functionality
          ...(isMobile && {
            msOverflowStyle: '-ms-autohiding-scrollbar',
          }),
        }}
        className="mobile-filter-bar"
      >
        {options.map((option) => {
          const isActive = activeFilter === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={option.disabled}
              onClick={() => !option.disabled && onFilterChange(option.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing[2],
                padding: `${tokens.spacing[2]} ${tokens.spacing[4]}`,
                border: `1px solid ${isActive ? tokens.colors.primary.DEFAULT : tokens.colors.border.default}`,
                borderRadius: tokens.borderRadius.full,
                backgroundColor: isActive
                  ? tokens.colors.primary.DEFAULT
                  : tokens.colors.background.primary,
                color: isActive
                  ? tokens.colors.text.inverse
                  : option.disabled
                  ? tokens.colors.text.disabled
                  : tokens.colors.text.primary,
                fontWeight: isActive
                  ? tokens.typography.fontWeight.semibold
                  : tokens.typography.fontWeight.medium,
                fontSize: tokens.typography.fontSize.sm[0],
                cursor: option.disabled ? 'not-allowed' : 'pointer',
                transition: `all ${tokens.transitions.duration.DEFAULT}`,
                whiteSpace: 'nowrap',
                flexShrink: 0, // Prevent filter chips from shrinking
                minHeight: '2.5rem', // Minimum touch target
                opacity: option.disabled ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!option.disabled && !isActive) {
                  e.currentTarget.style.backgroundColor = tokens.colors.background.secondary;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = isActive
                    ? tokens.colors.primary.DEFAULT
                    : tokens.colors.background.primary;
                }
              }}
            >
              <span>{option.label}</span>
              {option.badge !== undefined && option.badge > 0 && (
                <span
                  style={{
                    backgroundColor: isActive
                      ? tokens.colors.text.inverse
                      : tokens.colors.primary.DEFAULT,
                    color: isActive
                      ? tokens.colors.primary.DEFAULT
                      : tokens.colors.text.inverse,
                    borderRadius: tokens.borderRadius.full,
                    padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
                    fontSize: tokens.typography.fontSize.xs[0],
                    fontWeight: tokens.typography.fontWeight.bold,
                    minWidth: '1.25rem',
                    textAlign: 'center',
                    lineHeight: 1,
                  }}
                >
                  {option.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <style jsx global>{`
        .mobile-filter-bar::-webkit-scrollbar {
          height: 4px;
        }
        .mobile-filter-bar::-webkit-scrollbar-track {
          background: ${tokens.colors.background.secondary};
        }
        .mobile-filter-bar::-webkit-scrollbar-thumb {
          background: ${tokens.colors.border.default};
          border-radius: ${tokens.borderRadius.full};
        }
        .mobile-filter-bar::-webkit-scrollbar-thumb:hover {
          background: ${tokens.colors.text.secondary};
        }
      `}</style>
    </div>
  );
};

