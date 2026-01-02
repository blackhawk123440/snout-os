/**
 * Table Component - System DNA Implementation
 * 
 * Enterprise data table with temporal transitions and spatial depth.
 * Tables feel elastic without flashy animation.
 * Motion is subtle and communicates state changes.
 */

import React, { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { spatial } from '@/lib/spatial-hierarchy';
import { motion } from '@/lib/motion-system';

export interface TableColumn<T = any> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface TableProps<T = any> extends React.HTMLAttributes<HTMLTableElement> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T, index: number) => void;
  keyExtractor?: (row: T, index: number) => string;
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  keyExtractor,
  ...props
}: TableProps<T>) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  
  const getKey = (row: T, index: number): string => {
    if (keyExtractor) return keyExtractor(row, index);
    return row.id || row.key || `row-${index}`;
  };

  return (
    <div
      style={{
        border: spatial.border('surface', 'subtle'),
        borderRadius: tokens.borderRadius.lg,
        overflow: 'hidden',
        backgroundColor: tokens.colors.white.material,
        ...spatial.getLayerStyles('surface'),
      }}
    >
      <div
        style={{
          overflowX: 'auto',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 300px)',
        }}
      >
        <table
          {...props}
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            ...props.style,
          }}
        >
          <thead
            style={{
              position: 'sticky',
              top: 0,
              zIndex: tokens.zIndex.sticky,
              backgroundColor: tokens.colors.white.material,
              borderBottom: spatial.border('surface', 'normal'),
            }}
          >
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{
                    padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
                    textAlign: column.align || 'left',
                    fontSize: tokens.typography.fontSize.sm[0],
                    fontWeight: tokens.typography.fontWeight.semibold,
                    color: tokens.colors.text.primary,
                    textTransform: 'uppercase',
                    letterSpacing: tokens.typography.letterSpacing.wide,
                    width: column.width,
                    minWidth: column.width,
                    whiteSpace: 'nowrap',
                    backgroundColor: tokens.colors.white.material,
                  }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Loading skeleton rows
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      style={{
                        padding: `${tokens.spacing[4]} ${tokens.spacing[4]}`,
                        textAlign: column.align || 'left',
                      }}
                    >
                      <div
                        style={{
                          height: '1rem',
                          backgroundColor: tokens.colors.neutral[200],
                          borderRadius: tokens.borderRadius.sm,
                          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty state
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: tokens.spacing[12],
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: tokens.spacing[2],
                      color: tokens.colors.text.secondary,
                    }}
                  >
                    <div
                      style={{
                        fontSize: tokens.typography.fontSize['2xl'][0],
                        opacity: 0.5,
                      }}
                    >
                      📭
                    </div>
                    <p
                      style={{
                        fontSize: tokens.typography.fontSize.base[0],
                        fontWeight: tokens.typography.fontWeight.medium,
                      }}
                    >
                      {emptyMessage}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={getKey(row, index)}
                  onClick={() => onRowClick?.(row, index)}
                  onMouseEnter={() => setHoveredRow(index)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    backgroundColor: hoveredRow === index 
                      ? tokens.colors.primary.opacity[5] 
                      : 'transparent',
                    ...motion.styles('transition', ['background-color']),
                    borderBottom: index < data.length - 1 ? spatial.border('surface', 'subtle') : 'none',
                  }}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      style={{
                        padding: `${tokens.spacing[4]} ${tokens.spacing[4]}`,
                        textAlign: column.align || 'left',
                        fontSize: tokens.typography.fontSize.base[0],
                        color: tokens.colors.text.primary,
                      }}
                    >
                      {column.render ? column.render(row, index) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
