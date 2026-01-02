/**
 * FilterBar Component - Control Surface
 * 
 * Posture-aware filter bar for Analytical pages.
 * Tighter spacing, sharper presentation, high clarity.
 */

import React from 'react';
import { controlSurface } from '@/lib/design-tokens-control-surface';
import { usePosture } from './PostureProvider';
import { Input } from './Input';

export interface FilterBarProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters?: Array<{
    label: string;
    value: string;
    options: Array<{ label: string; value: string }>;
    selectedValue: string;
    onChange: (value: string) => void;
  }>;
  actions?: React.ReactNode;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchPlaceholder = 'Search...',
  searchValue,
  onSearchChange,
  filters = [],
  actions,
}) => {
  const { config } = usePosture();
  
  // Analytical posture: tighter spacing
  const spacing = config.spacing === 'tight' ? controlSurface.spacing[3] : controlSurface.spacing[4];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing,
        flexWrap: 'wrap',
        padding: controlSurface.spacing[4],
        backgroundColor: controlSurface.colors.base.depth1,
        border: controlSurface.spatial.border.subtle,
        borderRadius: controlSurface.spatial.radius.base,
      }}
    >
      {/* Search */}
      <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
        <Input
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          leftIcon={<i className="fas fa-search" />}
          size="sm"
        />
      </div>

      {/* Filters */}
      {filters.map((filter, index) => (
        <div key={index} style={{ flex: '0 0 auto' }}>
          <select
            value={filter.selectedValue}
            onChange={(e) => filter.onChange(e.target.value)}
            style={{
              padding: `${controlSurface.spacing[2]} ${controlSurface.spacing[3]}`,
              backgroundColor: controlSurface.colors.base.depth2,
              color: controlSurface.colors.base.neutral.primary,
              border: controlSurface.spatial.border.base,
              borderRadius: controlSurface.spatial.radius.base,
              fontSize: controlSurface.typography.fontSize.sm[0] as string,
              fontFamily: controlSurface.typography.fontFamily.sans.join(', '),
              cursor: 'pointer',
              outline: 'none',
              transition: `all ${controlSurface.motion.duration.fast} ${controlSurface.motion.easing.ambient}`,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = controlSurface.colors.voltage.focus;
              e.currentTarget.style.boxShadow = `0 0 0 1px ${controlSurface.colors.voltage.focus}`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = controlSurface.spatial.border.base.split(' ')[2];
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      {/* Actions */}
      {actions && <div style={{ flex: '0 0 auto', marginLeft: 'auto' }}>{actions}</div>}
    </div>
  );
};

