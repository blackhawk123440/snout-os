/**
 * Table Component
 * 
 * Enterprise data table with sticky header, row hover, empty states, and loading skeletons.
 */

import React from 'react';
import { tokens } from '@/lib/design-tokens';

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
  const getKey = (row: T, index: number): string => {
    if (keyExtractor) return keyExtractor(row, index);
    return row.id || row.key || `row-${index}`;
  };

  return (
    <div
      style={{
        border: `1px solid ${tokens.colors.border.default}`,
        borderRadius: tokens.borderRadius.lg,
        overflow: 'hidden',
        backgroundColor: tokens.colors.background.primary,
        width: '100%',
        maxWidth: '100%',
      }}
    >
      <div
        className="table-wrapper"
        style={{
          overflowX: 'auto',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 300px)',
          width: '100%',
          maxWidth: '100%',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <table
          {...props}
          style={{
            width: '100%',
            minWidth: '100%',
            borderCollapse: 'collapse',
            tableLayout: 'auto',
            ...props.style,
          }}
        >
          <thead
            style={{
              position: 'sticky',
              top: 0,
              zIndex: tokens.zIndex.sticky,
              backgroundColor: tokens.colors.background.secondary,
              borderBottom: `2px solid ${tokens.colors.border.default}`,
            }}
          >
            <tr>
              {columns.map((column) => {
                const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
                return (
                  <th
                    key={column.key}
                    style={{
                      padding: isMobile 
                        ? `${tokens.spacing[2]} ${tokens.spacing[2]}` 
                        : `${tokens.spacing[3]} ${tokens.spacing[4]}`,
                      textAlign: column.align || 'left',
                      fontSize: isMobile 
                        ? tokens.typography.fontSize.xs[0] 
                        : tokens.typography.fontSize.sm[0],
                      fontWeight: tokens.typography.fontWeight.semibold,
                      color: tokens.colors.text.primary,
                      textTransform: 'uppercase',
                      letterSpacing: tokens.typography.letterSpacing.wide,
                      width: column.width,
                      minWidth: column.width,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {column.header}
                  </th>
                );
              })}
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
                        margin: 0,
                      }}
                    >
                      {emptyMessage}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              // Data rows
              data.map((row, index) => (
                <tr
                  key={getKey(row, index)}
                  onClick={() => onRowClick?.(row, index)}
                  style={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    borderBottom: `1px solid ${tokens.colors.border.muted}`,
                    transition: `background-color ${tokens.transitions.duration.DEFAULT}`,
                    ...(onRowClick && {
                      ':hover': {
                        backgroundColor: tokens.colors.background.secondary,
                      },
                    }),
                  }}
                  onMouseEnter={(e) => {
                    if (onRowClick) {
                      e.currentTarget.style.backgroundColor = tokens.colors.background.secondary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {columns.map((column) => {
                    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
                    return (
                      <td
                        key={column.key}
                        style={{
                          padding: isMobile 
                            ? `${tokens.spacing[2]} ${tokens.spacing[2]}` 
                            : `${tokens.spacing[3]} ${tokens.spacing[4]}`,
                          textAlign: column.align || 'left',
                          fontSize: isMobile 
                            ? tokens.typography.fontSize.sm[0] 
                            : tokens.typography.fontSize.base[0],
                          color: tokens.colors.text.primary,
                        }}
                      >
                        {column.render ? column.render(row, index) : row[column.key]}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}

