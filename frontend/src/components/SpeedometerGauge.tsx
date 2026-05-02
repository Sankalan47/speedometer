/**
 * components/SpeedometerGauge.tsx
 * Canvas-based speedometer gauge with smooth rAF animation.
 *
 * Design note: Animation state is kept in refs (not React state) so that
 * rAF callbacks never trigger React re-renders during the animation loop.
 * All geometry scales proportionally from the `size` prop so the gauge
 * renders correctly at any pixel dimension (mobile or desktop).
 */

import { useRef, useEffect, useCallback } from 'react';
import { SpeedGaugeProps } from '../types/index';
import { lerp, clamp, speedToAngle } from '../utils/speedMath';

const START_ANGLE = -135; // degrees, 0 km/h position
const SWEEP = 270;        // degrees total arc

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

interface AnimState {
  currentAngle: number;
  targetAngle: number;
  rafId: number | null;
}

export function SpeedometerGauge({ speed, maxSpeed = 200, size = 400 }: SpeedGaugeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<AnimState>({
    currentAngle: degToRad(START_ANGLE),
    targetAngle: degToRad(START_ANGLE),
    rafId: null,
  });
  const speedRef = useRef(speed);

  // Derived geometry — all proportional to size so mobile scales correctly
  const center = size / 2;
  const radius = size * 0.4;       // 160 / 400 = 0.4
  const scale = size / 400;        // font / stroke sizes relative to base 400px

  const draw = useCallback((ctx: CanvasRenderingContext2D, angleDeg: number) => {
    ctx.clearRect(0, 0, size, size);

    // 1. Background arc (dark track)
    ctx.beginPath();
    ctx.arc(center, center, radius, degToRad(START_ANGLE), degToRad(START_ANGLE + SWEEP));
    ctx.strokeStyle = '#1e2433';
    ctx.lineWidth = 18 * scale;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 2. Colored speed arc (green → amber → red)
    const ratio = clamp((angleDeg - START_ANGLE) / SWEEP, 0, 1);
    if (ratio > 0) {
      const endAngle = START_ANGLE + ratio * SWEEP;
      const greenEnd = START_ANGLE + SWEEP * 0.6;
      const amberEnd = START_ANGLE + SWEEP * 0.8;

      const segments: Array<{ from: number; to: number; color: string }> = [
        { from: START_ANGLE, to: Math.min(endAngle, greenEnd), color: '#22c55e' },
        { from: greenEnd,    to: Math.min(endAngle, amberEnd), color: '#f59e0b' },
        { from: amberEnd,    to: endAngle,                     color: '#ef4444' },
      ];

      for (const seg of segments) {
        if (seg.to <= seg.from) continue;
        ctx.beginPath();
        ctx.arc(center, center, radius, degToRad(seg.from), degToRad(seg.to));
        ctx.strokeStyle = seg.color;
        ctx.lineWidth = 18 * scale;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }

    // 3 & 4. Tick marks + major labels
    for (let spd = 0; spd <= maxSpeed; spd += 5) {
      const isMajor = spd % 20 === 0;
      const tickAngle = degToRad(speedToAngle(spd, maxSpeed));
      const outerR = radius + 12 * scale;
      const innerR = radius + (isMajor ? 24 : 18) * scale;

      const cos = Math.cos(tickAngle);
      const sin = Math.sin(tickAngle);

      ctx.beginPath();
      ctx.moveTo(center + cos * outerR, center + sin * outerR);
      ctx.lineTo(center + cos * innerR, center + sin * innerR);
      ctx.strokeStyle = isMajor ? '#94a3b8' : '#374151';
      ctx.lineWidth = isMajor ? 2 * scale : 1 * scale;
      ctx.stroke();

      if (isMajor) {
        const labelR = radius + 38 * scale;
        ctx.font = `700 ${Math.round(11 * scale)}px 'Courier New', monospace`;
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(spd), center + cos * labelR, center + sin * labelR);
      }
    }

    // 5. Needle
    const needleAngle = degToRad(angleDeg);
    const needleLen = radius - 20 * scale;
    const needleCos = Math.cos(needleAngle);
    const needleSin = Math.sin(needleAngle);

    ctx.save();
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 15 * scale;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(center + needleCos * needleLen, center + needleSin * needleLen);
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 3 * scale;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();

    // Hub circle
    ctx.beginPath();
    ctx.arc(center, center, 8 * scale, 0, Math.PI * 2);
    ctx.fillStyle = '#f97316';
    ctx.fill();

    // 6. Digital readout
    const displaySpeed = Math.round(speedRef.current);
    ctx.font = `700 ${Math.round(36 * scale)}px 'Courier New', monospace`;
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(displaySpeed).padStart(3, '0'), center, center + 60 * scale);

    // 7. Unit label
    ctx.font = `700 ${Math.round(12 * scale)}px 'Courier New', monospace`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('km/h', center, center + 85 * scale);
  }, [size, center, radius, scale, maxSpeed]);

  const animate = useCallback((ctx: CanvasRenderingContext2D) => {
    const anim = animRef.current;
    // t=0.08 gives snappy but smooth easing
    anim.currentAngle = lerp(anim.currentAngle, anim.targetAngle, 0.08);
    draw(ctx, (anim.currentAngle * 180) / Math.PI);

    if (Math.abs(anim.currentAngle - anim.targetAngle) > 0.001) {
      anim.rafId = requestAnimationFrame(() => animate(ctx));
    } else {
      anim.currentAngle = anim.targetAngle;
      anim.rafId = null;
    }
  }, [draw]);

  // Update target angle when speed changes
  useEffect(() => {
    speedRef.current = speed;
    const targetDeg = speedToAngle(speed, maxSpeed);
    animRef.current.targetAngle = degToRad(targetDeg);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (animRef.current.rafId === null) {
      animRef.current.rafId = requestAnimationFrame(() => animate(ctx));
    }
  }, [speed, maxSpeed, animate]);

  // Re-initialise canvas whenever size changes (also runs on mount)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Cancel any in-flight animation before resizing the canvas
    if (animRef.current.rafId !== null) {
      cancelAnimationFrame(animRef.current.rafId);
      animRef.current.rafId = null;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    draw(ctx, (animRef.current.currentAngle * 180) / Math.PI);

    return () => {
      if (animRef.current.rafId !== null) {
        cancelAnimationFrame(animRef.current.rafId);
        animRef.current.rafId = null;
      }
    };
  }, [size, draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, display: 'block' }}
      aria-label={`Speedometer showing ${Math.round(speed)} km/h`}
    />
  );
}
