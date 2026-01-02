/**
 * Table Component - Control Surface
 * 
 * Enterprise table with "alive futuristic organism" vibe.
 * Row hover feels magnetic and subtle.
 * No generic admin UI - feels intelligent and present.
 */

import React from 'react';
import { controlSurface } from '@/lib/design-tokens-control-surface';
import { usePosture, getMotionDuration } from './PostureProvider';

export interface TableColumn<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  onRowClick?: (row: T, index: number) => void;
  emptyState?: React.ReactNode;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyState,
}: TableProps<T>): React.ReactElement {
  const { config, posture } = usePosture();
  const motionDuration = getMotionDuration(posture, controlSurface.motion.duration.base);

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div
      style={{
        backgroundColor: controlSurface.colors.base.depth1,
        borderRadius: controlSurface.spatial.radius.medium,
        border: controlSurface.spatial.border.base,
        overflow: 'hidden',
      }}
    >
      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: controlSurface.typography.fontFamily.sans.join(', '),
          }}
        >
          {/* Header */}
          <thead>
            <tr
              style={{
                backgroundColor: controlSurface.colors.base.depth2,
                borderBottom: controlSurface.spatial.border.base,
              }}
            >
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{
                    padding: `${controlSurface.spacing[4]} ${controlSurface.spacing[5]}`,
                    textAlign: column.align || 'left',
                    fontSize: controlSurface.typography.fontSize.sm[0] as string,
                    fontWeight: controlSurface.typography.fontWeight.semibold,
                    color: controlSurface.colors.base.neutral.secondary,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    borderBottom: controlSurface.spatial.border.subtle,
                    width: column.width,
                    position: 'sticky',
                    top: 0,
                    zIndex: controlSurface.spatial.depth.elevated,
                    backgroundColor: controlSurface.colors.base.depth2,
                  }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {data.map((row, index) => {
              const key = keyExtractor(row, index);
              return (
                <tr
                  key={key}
                  onClick={() => onRowClick?.(row, index)}
                  style={{
                    borderBottom: controlSurface.spatial.border.subtle,
                    cursor: onRowClick ? 'pointer' : 'default',
                    transition: `all ${motionDuration} ${controlSurface.motion.easing.ambient}`,
                    backgroundColor: controlSurface.colors.base.depth1,
                  }}
                  onMouseEnter={(e) => {
                    if (config.ambientMotionEnabled) {
                      // Magnetic hover: subtle elevation + voltage edge
                      e.currentTarget.style.backgroundColor = controlSurface.colors.base.depth2;
                      e.currentTarget.style.boxShadow = `inset 0 0 0 1px ${controlSurface.colors.voltage.edge}`;
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    } else {
                      // Still posture: just background change
                      e.currentTarget.style.backgroundColor = controlSurface.colors.base.depth2;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = controlSurface.colors.base.depth1;
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      style={{
                        padding: `${controlSurface.spacing[4]} ${controlSurface.spacing[5]}`,
                        textAlign: column.align || 'left',
                        fontSize: controlSurface.typography.fontSize.base[0] as string,
                        color: controlSurface.colors.base.neutral.primary,
                        lineHeight: (controlSurface.typography.fontSize.base[1] as { lineHeight: string }).lineHeight,
                      }}
                    >
                      {column.render ? column.render(row, index) : String((row as any)[column.key] ?? '')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

