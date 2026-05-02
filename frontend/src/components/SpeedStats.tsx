/**
 * components/SpeedStats.tsx
 * Four stat cards showing current, max, avg, and min speeds.
 *
 * Design note: The current card has a CSS pulse animation that fires whenever
 * the speed value changes, implemented via a key prop re-mount trick.
 */

import { useRef } from 'react';

interface Props {
  currentSpeed: number;
  maxSpeed: number;
  avgSpeed: number;
  minSpeed: number;
}

interface CardProps {
  label: string;
  value: number;
  sublabel?: string;
  pulse?: boolean;
}

function StatCard({ label, value, sublabel, pulse = false }: CardProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-800/60 p-4 gap-1">
      <span className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">
        {label}
      </span>
      <span
        key={pulse ? value.toFixed(1) : undefined}
        className={`text-3xl font-mono font-bold text-slate-100 tabular-nums ${
          pulse ? 'animate-pulse-once' : ''
        }`}
      >
        {value.toFixed(1)}
      </span>
      <span className="text-xs font-mono text-slate-500">km/h</span>
      {sublabel && (
        <span className="text-[10px] font-mono text-slate-600 tracking-wide">
          {sublabel}
        </span>
      )}
    </div>
  );
}

export function SpeedStats({ currentSpeed, maxSpeed, avgSpeed, minSpeed }: Props) {
  const prevSpeed = useRef(currentSpeed);
  const changed = prevSpeed.current !== currentSpeed;
  prevSpeed.current = currentSpeed;

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard label="Current" value={currentSpeed} pulse={changed} />
      <StatCard label="Max" value={maxSpeed} />
      <StatCard label="Rolling Avg" value={avgSpeed} sublabel="last 60 pts" />
      <StatCard label="Min" value={minSpeed} />
    </div>
  );
}
