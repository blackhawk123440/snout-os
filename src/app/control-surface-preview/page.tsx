/**
 * Control Surface Design System Preview
 * 
 * Standalone preview page to showcase the new design DNA:
 * - Dark base foundation
 * - Pink voltage as energy flow
 * - Spatial depth and layering
 * - Temporal intelligence (motion)
 * - Observational posture (calm, wide, stable)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Panel, StatCard, Button } from '@/components/control-surface';
import { controlSurface } from '@/lib/design-tokens-control-surface';

export default function ControlSurfacePreview() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((c) => c + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: controlSurface.colors.base.depth0,
        color: controlSurface.colors.base.neutral.primary,
        fontFamily: controlSurface.typography.fontFamily.sans.join(', '),
        padding: controlSurface.spacing[8],
        display: 'flex',
        flexDirection: 'column',
        gap: controlSurface.spacing[8],
      }}
    >
      {/* Header */}
      <div
        style={{
          maxWidth: controlSurface.layout.container.maxWidth,
          width: '100%',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            fontSize: controlSurface.typography.fontSize['3xl'][0] as string,
            fontWeight: controlSurface.typography.fontWeight.bold,
            color: controlSurface.colors.base.neutral.primary,
            marginBottom: controlSurface.spacing[2],
          }}
        >
          Control Surface Preview
        </div>
        <div
          style={{
            fontSize: controlSurface.typography.fontSize.base[0] as string,
            color: controlSurface.colors.base.neutral.secondary,
            lineHeight: (controlSurface.typography.fontSize.base[1] as { lineHeight: string }).lineHeight,
          }}
        >
          Dark base. Pink voltage. Spatial depth. Temporal intelligence.
        </div>
      </div>

      {/* Main Content Container */}
      <div
        style={{
          maxWidth: controlSurface.layout.container.maxWidth,
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: controlSurface.spacing[8],
        }}
      >
        {/* Stats Grid - Observational Posture */}
        <section>
          <div
            style={{
              fontSize: controlSurface.typography.fontSize.xl[0] as string,
              fontWeight: controlSurface.typography.fontWeight.semibold,
              color: controlSurface.colors.base.neutral.primary,
              marginBottom: controlSurface.spacing[6],
            }}
          >
            Observational Posture (Dashboard)
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: controlSurface.spacing[6],
            }}
          >
            <StatCard
              label="Active Bookings"
              value={42}
              icon={<i className="fas fa-calendar-check" />}
              voltage="ambient"
            />
            <StatCard
              label="Active Sitters"
              value={8}
              icon={<i className="fas fa-user-friends" />}
              voltage="edge"
            />
            <StatCard
              label="Total Revenue"
              value="$12,450"
              icon={<i className="fas fa-dollar-sign" />}
              trend="up"
              voltage="focus"
            />
            <StatCard
              label="Client Satisfaction"
              value="98%"
              icon={<i className="fas fa-smile" />}
              trend="neutral"
              voltage="ambient"
            />
          </div>
        </section>

        {/* Panel Depth Demonstration */}
        <section>
          <div
            style={{
              fontSize: controlSurface.typography.fontSize.xl[0] as string,
              fontWeight: controlSurface.typography.fontWeight.semibold,
              color: controlSurface.colors.base.neutral.primary,
              marginBottom: controlSurface.spacing[6],
            }}
          >
            Spatial Depth System
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: controlSurface.spacing[6],
            }}
          >
            <Panel depth="base" voltage="ambient" spacing="moderate">
              <div
                style={{
                  fontSize: controlSurface.typography.fontSize.base[0] as string,
                  color: controlSurface.colors.base.neutral.secondary,
                }}
              >
                <strong style={{ color: controlSurface.colors.base.neutral.primary }}>Base Depth</strong>
                <br />
                Standard panel with ambient voltage glow
              </div>
            </Panel>

            <Panel depth="elevated" voltage="edge" spacing="moderate">
              <div
                style={{
                  fontSize: controlSurface.typography.fontSize.base[0] as string,
                  color: controlSurface.colors.base.neutral.secondary,
                }}
              >
                <strong style={{ color: controlSurface.colors.base.neutral.primary }}>Elevated Depth</strong>
                <br />
                Raised panel with edge voltage emphasis
              </div>
            </Panel>

            <Panel depth="floating" voltage="edge" spacing="moderate">
              <div
                style={{
                  fontSize: controlSurface.typography.fontSize.base[0] as string,
                  color: controlSurface.colors.base.neutral.secondary,
                }}
              >
                <strong style={{ color: controlSurface.colors.base.neutral.primary }}>Floating Depth</strong>
                <br />
                Floating panel with focus voltage signal
              </div>
            </Panel>
          </div>
        </section>

        {/* Voltage System Demonstration */}
        <section>
          <div
            style={{
              fontSize: controlSurface.typography.fontSize.xl[0] as string,
              fontWeight: controlSurface.typography.fontWeight.semibold,
              color: controlSurface.colors.base.neutral.primary,
              marginBottom: controlSurface.spacing[6],
            }}
          >
            Voltage System (Pink as Energy Flow)
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: controlSurface.spacing[4],
            }}
          >
            <Panel depth="elevated" voltage="none" spacing="moderate">
              <div
                style={{
                  fontSize: controlSurface.typography.fontSize.sm[0] as string,
                  color: controlSurface.colors.base.neutral.secondary,
                  textAlign: 'center',
                }}
              >
                None
              </div>
            </Panel>
            <Panel depth="elevated" voltage="ambient" spacing="moderate">
              <div
                style={{
                  fontSize: controlSurface.typography.fontSize.sm[0] as string,
                  color: controlSurface.colors.base.neutral.secondary,
                  textAlign: 'center',
                }}
              >
                Ambient
              </div>
            </Panel>
            <Panel depth="elevated" voltage="edge" spacing="moderate">
              <div
                style={{
                  fontSize: controlSurface.typography.fontSize.sm[0] as string,
                  color: controlSurface.colors.base.neutral.secondary,
                  textAlign: 'center',
                }}
              >
                Edge
              </div>
            </Panel>
            <Panel depth="elevated" voltage="focus" spacing="moderate">
              <div
                style={{
                  fontSize: controlSurface.typography.fontSize.sm[0] as string,
                  color: controlSurface.colors.base.neutral.secondary,
                  textAlign: 'center',
                }}
              >
                Focus
              </div>
            </Panel>
          </div>
          <div
            style={{
              marginTop: controlSurface.spacing[4],
              fontSize: controlSurface.typography.fontSize.sm[0] as string,
              color: controlSurface.colors.base.neutral.tertiary,
            }}
          >
            Pink voltage indicates system importance and focus. It's energy flow, not branding.
          </div>
        </section>

        {/* Button System */}
        <section>
          <div
            style={{
              fontSize: controlSurface.typography.fontSize.xl[0] as string,
              fontWeight: controlSurface.typography.fontWeight.semibold,
              color: controlSurface.colors.base.neutral.primary,
              marginBottom: controlSurface.spacing[6],
            }}
          >
            Button System
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: controlSurface.spacing[4],
              alignItems: 'center',
            }}
          >
            <Button variant="primary" size="md">
              Primary Action
            </Button>
            <Button variant="secondary" size="md">
              Secondary Action
            </Button>
            <Button variant="tertiary" size="md">
              Tertiary Action
            </Button>
            <Button variant="ghost" size="md">
              Ghost Action
            </Button>
            <Button variant="primary" size="sm">
              Small
            </Button>
            <Button variant="primary" size="lg">
              Large
            </Button>
            <Button variant="primary" size="md" isLoading>
              Loading...
            </Button>
            <Button variant="primary" size="md" disabled>
              Disabled
            </Button>
          </div>
        </section>

        {/* Typography System */}
        <section>
          <div
            style={{
              fontSize: controlSurface.typography.fontSize.xl[0] as string,
              fontWeight: controlSurface.typography.fontWeight.semibold,
              color: controlSurface.colors.base.neutral.primary,
              marginBottom: controlSurface.spacing[6],
            }}
          >
            Typography System
          </div>
          <Panel depth="elevated" voltage="ambient" spacing="moderate">
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: controlSurface.spacing[6],
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: controlSurface.typography.fontSize['3xl'][0] as string,
                    fontWeight: controlSurface.typography.fontWeight.bold,
                    color: controlSurface.colors.base.neutral.primary,
                    lineHeight: (controlSurface.typography.fontSize['3xl'][1] as { lineHeight: string }).lineHeight,
                    marginBottom: controlSurface.spacing[2],
                  }}
                >
                  3XL Heading
                </div>
                <div
                  style={{
                    fontSize: controlSurface.typography.fontSize.xs[0] as string,
                    color: controlSurface.colors.base.neutral.tertiary,
                  }}
                >
                  Heading style for major page titles
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: controlSurface.typography.fontSize.xl[0] as string,
                    fontWeight: controlSurface.typography.fontWeight.semibold,
                    color: controlSurface.colors.base.neutral.primary,
                    marginBottom: controlSurface.spacing[2],
                  }}
                >
                  XL Heading
                </div>
                <div
                  style={{
                    fontSize: controlSurface.typography.fontSize.xs[0] as string,
                    color: controlSurface.colors.base.neutral.tertiary,
                  }}
                >
                  Section headings
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: controlSurface.typography.fontSize.base[0] as string,
                    color: controlSurface.colors.base.neutral.primary,
                    lineHeight: (controlSurface.typography.fontSize.base[1] as { lineHeight: string }).lineHeight,
                    marginBottom: controlSurface.spacing[2],
                  }}
                >
                  Base Body Text
                </div>
                <div
                  style={{
                    fontSize: controlSurface.typography.fontSize.xs[0] as string,
                    color: controlSurface.colors.base.neutral.tertiary,
                  }}
                >
                  Primary content text. Restrained, legible, authoritative.
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: controlSurface.typography.fontSize.sm[0] as string,
                    color: controlSurface.colors.base.neutral.secondary,
                    marginBottom: controlSurface.spacing[2],
                  }}
                >
                  Small Text
                </div>
                <div
                  style={{
                    fontSize: controlSurface.typography.fontSize.xs[0] as string,
                    color: controlSurface.colors.base.neutral.tertiary,
                  }}
                >
                  Secondary information, labels, metadata
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: controlSurface.typography.fontSize.xs[0] as string,
                    color: controlSurface.colors.base.neutral.tertiary,
                    fontFamily: controlSurface.typography.fontFamily.mono.join(', '),
                    marginBottom: controlSurface.spacing[2],
                  }}
                >
                  XS Mono Text
                </div>
                <div
                  style={{
                    fontSize: controlSurface.typography.fontSize.xs[0] as string,
                    color: controlSurface.colors.base.neutral.tertiary,
                  }}
                >
                  Code, IDs, technical data
                </div>
              </div>
            </div>
          </Panel>
        </section>

        {/* Color System */}
        <section>
          <div
            style={{
              fontSize: controlSurface.typography.fontSize.xl[0] as string,
              fontWeight: controlSurface.typography.fontWeight.semibold,
              color: controlSurface.colors.base.neutral.primary,
              marginBottom: controlSurface.spacing[6],
            }}
          >
            Color System
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: controlSurface.spacing[4],
            }}
          >
            <Panel depth="elevated" spacing="moderate">
              <div
                style={{
                  fontSize: controlSurface.typography.fontSize.sm[0] as string,
                  fontWeight: controlSurface.typography.fontWeight.medium,
                  marginBottom: controlSurface.spacing[3],
                }}
              >
                Base Depths
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: controlSurface.spacing[2] }}>
                <div
                  style={{
                    padding: controlSurface.spacing[2],
                    backgroundColor: controlSurface.colors.base.depth0,
                    borderRadius: controlSurface.spatial.radius.base,
                    fontSize: controlSurface.typography.fontSize.xs[0] as string,
                  }}
                >
                  depth0: {controlSurface.colors.base.depth0}
                </div>
                <div
                  style={{
                    padding: controlSurface.spacing[2],
                    backgroundColor: controlSurface.colors.base.depth1,
                    borderRadius: controlSurface.spatial.radius.base,
                    fontSize: controlSurface.typography.fontSize.xs[0] as string,
                  }}
                >
                  depth1: {controlSurface.colors.base.depth1}
                </div>
                <div
                  style={{
                    padding: controlSurface.spacing[2],
                    backgroundColor: controlSurface.colors.base.depth2,
                    borderRadius: controlSurface.spatial.radius.base,
                    fontSize: controlSurface.typography.fontSize.xs[0] as string,
                  }}
                >
                  depth2: {controlSurface.colors.base.depth2}
                </div>
                <div
                  style={{
                    padding: controlSurface.spacing[2],
                    backgroundColor: controlSurface.colors.base.depth3,
                    borderRadius: controlSurface.spatial.radius.base,
                    fontSize: controlSurface.typography.fontSize.xs[0] as string,
                  }}
                >
                  depth3: {controlSurface.colors.base.depth3}
                </div>
              </div>
            </Panel>

            <Panel depth="elevated" spacing="moderate">
              <div
                style={{
                  fontSize: controlSurface.typography.fontSize.sm[0] as string,
                  fontWeight: controlSurface.typography.fontWeight.medium,
                  marginBottom: controlSurface.spacing[3],
                }}
              >
                Neutral Text
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: controlSurface.spacing[2] }}>
                <div style={{ color: controlSurface.colors.base.neutral.primary }}>Primary Text</div>
                <div style={{ color: controlSurface.colors.base.neutral.secondary }}>Secondary Text</div>
                <div style={{ color: controlSurface.colors.base.neutral.tertiary }}>Tertiary Text</div>
                <div style={{ color: controlSurface.colors.base.neutral.quaternary }}>Quaternary Text</div>
              </div>
            </Panel>

            <Panel depth="elevated" spacing="moderate">
              <div
                style={{
                  fontSize: controlSurface.typography.fontSize.sm[0] as string,
                  fontWeight: controlSurface.typography.fontWeight.medium,
                  marginBottom: controlSurface.spacing[3],
                }}
              >
                Status Colors
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: controlSurface.spacing[2] }}>
                <div style={{ color: controlSurface.colors.status.success.base }}>Success</div>
                <div style={{ color: controlSurface.colors.status.warning.base }}>Warning</div>
                <div style={{ color: controlSurface.colors.status.error.base }}>Error</div>
                <div style={{ color: controlSurface.colors.status.info.base }}>Info</div>
              </div>
            </Panel>
          </div>
        </section>

        {/* Temporal Intelligence Demo */}
        <section>
          <div
            style={{
              fontSize: controlSurface.typography.fontSize.xl[0] as string,
              fontWeight: controlSurface.typography.fontWeight.semibold,
              color: controlSurface.colors.base.neutral.primary,
              marginBottom: controlSurface.spacing[6],
            }}
          >
            Temporal Intelligence (Time-Aware)
          </div>
          <Panel depth="elevated" voltage="ambient" spacing="moderate">
            <div
              style={{
                fontSize: controlSurface.typography.fontSize.base[0] as string,
                color: controlSurface.colors.base.neutral.secondary,
                lineHeight: (controlSurface.typography.fontSize.base[1] as { lineHeight: string }).lineHeight,
              }}
            >
              System updates: {count}
              <br />
              <br />
              The system is time-aware, not event-driven. Importance ramps up and down gradually. UI elements
              gain presence before requiring action. Motion feels like breathing, not triggering.
            </div>
          </Panel>
        </section>

        {/* Footer */}
        <div
          style={{
            marginTop: controlSurface.spacing[12],
            paddingTop: controlSurface.spacing[8],
            borderTop: controlSurface.spatial.border.subtle,
            fontSize: controlSurface.typography.fontSize.sm[0] as string,
            color: controlSurface.colors.base.neutral.tertiary,
            textAlign: 'center',
          }}
        >
          Control Surface Design System Preview
          <br />
          Dark base • Pink voltage • Spatial depth • Temporal intelligence
        </div>
      </div>
    </div>
  );
}

