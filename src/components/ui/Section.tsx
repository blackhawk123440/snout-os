/**
 * Section Component
 * UI Constitution V1 - Layout Primitive
 * 
 * Standard section with heading, subheading, actions slot, and optional divider.
 * Consistent spacing tokens throughout.
 * 
 * @example
 * ```tsx
 * <Section
 *   heading="Bookings"
 *   subheading="Manage your bookings"
 *   actions={<Button>Add Booking</Button>}
 *   divider
 * >
 *   <BookingList />
 * </Section>
 * ```
 */

'use client';

import { ReactNode } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from './utils';

export interface SectionProps {
  heading?: string;
  subheading?: string;
  actions?: ReactNode;
  children?: ReactNode;
  divider?: boolean;
  className?: string;
  'data-testid'?: string;
}

export function Section({
  heading,
  subheading,
  actions,
  children,
  divider = false,
  className,
  'data-testid': testId,
}: SectionProps) {
  return (
    <section
      data-testid={testId || 'section'}
      className={cn('section', className)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacing[6], // Phase 8: Increased gap for breathing room
        paddingBottom: divider ? tokens.spacing[8] : 0, // Phase 8: More separation
        borderBottom: divider
          ? `1px solid ${tokens.colors.border.default}`
          : 'none',
        marginBottom: divider ? tokens.spacing[8] : tokens.spacing[6], // Phase 8: Consistent spacing
      }}
    >
      {/* Header */}
      {(heading || subheading || actions) && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing[2],
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: tokens.spacing[4],
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: tokens.spacing[1],
                flex: 1,
                minWidth: 0,
              }}
            >
              {heading && (
                <h2
                  style={{
                    fontSize: tokens.typography.fontSize['2xl'][0], // Phase 8: Larger heading
                    fontWeight: tokens.typography.fontWeight.bold,
                    color: tokens.colors.text.primary,
                    margin: 0,
                    letterSpacing: tokens.typography.letterSpacing.tight, // Phase 8: Tighter tracking
                    lineHeight: tokens.typography.fontSize['2xl'][1].lineHeight,
                  }}
                >
                  {heading}
                </h2>
              )}
              {subheading && (
                <p
                  style={{
                    fontSize: tokens.typography.fontSize.base[0], // Phase 8: Larger subheading
                    color: tokens.colors.text.secondary,
                    margin: 0,
                    lineHeight: tokens.typography.fontSize.base[1].lineHeight,
                  }}
                >
                  {subheading}
                </p>
              )}
            </div>
            {actions && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing[2],
                  flexShrink: 0,
                }}
              >
                {actions}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {children && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing[4],
          }}
        >
          {children}
        </div>
      )}
    </section>
  );
}
