/**
 * Chart Component - Control Surface
 * 
 * Elastic, continuous scaling charts for Analytical posture.
 * No hard redraws, smooth axis transitions, magnetic hover.
 * Preserves continuity through posture-aware motion.
 */

import React, { useRef, useEffect, useState } from 'react';
import { controlSurface } from '@/lib/design-tokens-control-surface';
import { usePosture, getMotionDuration } from './PostureProvider';

export interface ChartDataPoint {
  x: number | string | Date;
  y: number;
  label?: string;
}

export interface ChartProps {
  data: ChartDataPoint[];
  width?: number;
  height?: number;
  type?: 'line' | 'bar' | 'area';
  color?: string; // Use voltage colors only
  showGrid?: boolean;
  showAxes?: boolean;
  onPointHover?: (point: ChartDataPoint | null) => void;
  className?: string;
}

export const Chart: React.FC<ChartProps> = ({
  data,
  width = 400,
  height = 200,
  type = 'line',
  color,
  showGrid = true,
  showAxes = true,
  onPointHover,
  className,
}) => {
  const { config, posture } = usePosture();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);
  const motionDuration = getMotionDuration(posture, controlSurface.motion.duration.base);

  // Use voltage color or default to edge voltage
  const chartColor = color || controlSurface.colors.voltage.edge;
  const gridColor = controlSurface.colors.base.neutral.quaternary;
  const axisColor = controlSurface.colors.base.neutral.tertiary;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate bounds
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Normalize data
    const values = data.map((d) => d.y);
    const minY = Math.min(...values, 0);
    const maxY = Math.max(...values);
    const rangeY = maxY - minY || 1;

    // Draw grid (subtle, analytical)
    if (showGrid) {
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);

      const gridLines = 5;
      for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (chartHeight / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();
      }

      ctx.setLineDash([]);
    }

    // Draw axes
    if (showAxes) {
      ctx.strokeStyle = axisColor;
      ctx.lineWidth = 1;

      // Y-axis
      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top);
      ctx.lineTo(padding.left, padding.top + chartHeight);
      ctx.stroke();

      // X-axis
      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top + chartHeight);
      ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
      ctx.stroke();
    }

    // Draw chart
    if (type === 'line' || type === 'area') {
      ctx.strokeStyle = chartColor;
      ctx.lineWidth = 2;
      ctx.fillStyle = type === 'area' ? chartColor.replace('rgba', 'rgba').replace(')', ', 0.1)') : 'transparent';

      ctx.beginPath();
      data.forEach((point, index) => {
        const x = padding.left + (chartWidth / (data.length - 1 || 1)) * index;
        const y = padding.top + chartHeight - ((point.y - minY) / rangeY) * chartHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      if (type === 'area') {
        ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
        ctx.lineTo(padding.left, padding.top + chartHeight);
        ctx.closePath();
        ctx.fill();
      }

      ctx.stroke();
    } else if (type === 'bar') {
      ctx.fillStyle = chartColor;
      const barWidth = chartWidth / data.length;
      data.forEach((point, index) => {
        const barHeight = ((point.y - minY) / rangeY) * chartHeight;
        const x = padding.left + barWidth * index;
        const y = padding.top + chartHeight - barHeight;

        ctx.fillRect(x + barWidth * 0.1, y, barWidth * 0.8, barHeight);
      });
    }

    // Draw hover point
    if (hoveredPoint) {
      const pointIndex = data.findIndex((d) => d === hoveredPoint);
      if (pointIndex !== -1) {
        const x = padding.left + (chartWidth / (data.length - 1 || 1)) * pointIndex;
        const y = padding.top + chartHeight - ((hoveredPoint.y - minY) / rangeY) * chartHeight;

        // Voltage pulse on hover
        ctx.fillStyle = controlSurface.colors.voltage.focus;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = controlSurface.colors.base.depth1;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [data, width, height, type, chartColor, gridColor, axisColor, showGrid, showAxes, hoveredPoint, posture]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Find nearest point
    const pointWidth = chartWidth / (data.length - 1 || 1);
    const pointIndex = Math.round((x - padding.left) / pointWidth);
    const clampedIndex = Math.max(0, Math.min(data.length - 1, pointIndex));

    if (clampedIndex >= 0 && clampedIndex < data.length) {
      const point = data[clampedIndex];
      setHoveredPoint(point);
      onPointHover?.(point);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    onPointHover?.(null);
  };

  return (
    <div
      style={{
        position: 'relative',
        width: `${width}px`,
        height: `${height}px`,
      }}
      className={className}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: 'pointer',
          transition: `opacity ${motionDuration} ${controlSurface.motion.easing.ambient}`,
        }}
      />
    </div>
  );
};

