/**
 * Table Component
 * 
 * Enterprise data table with sticky header, row hover, empty states, and loading skeletons.
 * On mobile, renders as card list instead of table.
 */

import React from 'react';
import { tokens } from '@/lib/design-tokens';
import { useMobile } from '@/lib/use-mobile';
import { Card } from './Card';

export interface TableColumn<T = any> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
  mobileLabel?: string; // Label for mobile card view
  mobileOrder?: number; // Order in mobile view (lower = first)
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
  const isMobile = useMobile();
  
  const getKey = (row: T, index: number): string => {
    if (keyExtractor) return keyExtractor(row, index);
    return row.id || row.key || `row-${index}`;
  };

  // Mobile Card Layout
  if (isMobile) {
    const sortedColumns = [...columns].sort((a, b) => {
      const orderA = a.mobileOrder ?? 999;
      const orderB = b.mobileOrder ?? 999;
      return orderA - orderB;
    });

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.spacing[3],
          width: '100%',
          maxWidth: '100%',
          overflowX: 'hidden', // Part A: Zero horizontal scroll enforcement
        }}
      >
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <Card key={`skeleton-${index}`} style={{ padding: tokens.spacing[4] }}>
              <div
                style={{
                  height: '1rem',
                  backgroundColor: tokens.colors.neutral[200],
                  borderRadius: tokens.borderRadius.sm,
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  marginBottom: tokens.spacing[2],
                }}
              />
              <div
                style={{
                  height: '1rem',
                  width: '60%',
                  backgroundColor: tokens.colors.neutral[200],
                  borderRadius: tokens.borderRadius.sm,
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                }}
              />
            </Card>
          ))
        ) : data.length === 0 ? (
          <Card style={{ padding: tokens.spacing[6] }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: tokens.spacing[2],
                color: tokens.colors.text.secondary,
              }}
            >
              <div style={{ fontSize: tokens.typography.fontSize['2xl'][0], opacity: 0.5 }}>📭</div>
              <p style={{ fontSize: tokens.typography.fontSize.base[0], margin: 0 }}>{emptyMessage}</p>
            </div>
          </Card>
        ) : (
          data.map((row, index) => (
            <Card
              key={getKey(row, index)}
              onClick={() => onRowClick?.(row, index)}
              style={{
                padding: tokens.spacing[4],
                cursor: onRowClick ? 'pointer' : 'default',
                transition: `all ${tokens.transitions.duration.DEFAULT}`,
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                if (onRowClick) {
                  e.currentTarget.style.backgroundColor = tokens.colors.background.secondary;
                }
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                e.currentTarget.style.backgroundColor = tokens.colors.background.primary;
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
                {sortedColumns.map((column) => {
                  const content = column.render ? column.render(row, index) : row[column.key];
                  const label = column.mobileLabel || column.header;
                  
                  return (
                    <div key={column.key} style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[1] }}>
                      <div
                        style={{
                          fontSize: tokens.typography.fontSize.xs[0],
                          fontWeight: tokens.typography.fontWeight.medium,
                          color: tokens.colors.text.secondary,
                          textTransform: 'uppercase',
                          letterSpacing: tokens.typography.letterSpacing.wide,
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          fontSize: column.key === 'client' || column.key === 'service' 
                            ? tokens.typography.fontSize.xl[0]  // Even larger font for key info (client name, service) - mobile readability
                            : column.key === 'date' || column.key === 'schedule'
                            ? tokens.typography.fontSize.base[0]  // Standard size for dates
                            : tokens.typography.fontSize.sm[0],  // Slightly smaller for secondary info
                          fontWeight: column.key === 'client' 
                            ? tokens.typography.fontWeight.bold  // Bold client name for emphasis
                            : column.key === 'service'
                            ? tokens.typography.fontWeight.semibold
                            : tokens.typography.fontWeight.normal,
                          color: tokens.colors.text.primary,
                          wordBreak: 'break-word',
                          lineHeight: 1.4,
                        }}
                      >
                        {content}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))
        )}
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

  // Desktop Table Layout
  return (
    <div
      style={{
        border: `1px solid ${tokens.colors.border.default}`,
        borderRadius: tokens.borderRadius.lg,
        overflow: 'hidden',
        backgroundColor: tokens.colors.background.primary,
      }}
    >
      <div
        className="table-wrapper"
        style={{
          overflowX: isMobile ? 'hidden' : 'auto', // Part A: No horizontal scroll on mobile
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
            maxWidth: '100%', // Part A: Zero horizontal scroll enforcement
            borderCollapse: 'collapse',
            tableLayout: isMobile ? 'fixed' : 'auto', // Prevent table from forcing width on mobile
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

