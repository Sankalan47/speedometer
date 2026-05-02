/**
 * components/Dashboard.tsx
 * Top-level layout — positions the gauge, stats, chart, and status badge.
 *
 * Design note: Gauge size is computed from window.innerWidth so the canvas
 * draws at the correct pixel density on mobile without CSS scaling tricks.
 */

import { useState, useEffect } from 'react';
import { useSpeedStream } from '../hooks/useSpeedStream';
import { SpeedometerGauge } from './SpeedometerGauge';
import { SpeedStats } from './SpeedStats';
import { SpeedChart } from './SpeedChart';
import { ConnectionStatus } from './ConnectionStatus';

/** Return the appropriate gauge pixel size for the current viewport. */
function getGaugeSize(): number {
  // Below 640 px (Tailwind's sm breakpoint) shrink to fit with 16 px margin each side.
  return window.innerWidth < 640 ? Math.min(window.innerWidth - 32, 320) : 400;
}

export function Dashboard() {
  const { currentSpeed, history, status, maxSpeed, minSpeed, avgSpeed } = useSpeedStream();
  const [gaugeSize, setGaugeSize] = useState<number>(getGaugeSize);

  useEffect(() => {
    const update = () => setGaugeSize(getGaugeSize());
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div className="min-h-screen bg-transparent text-slate-100 p-4 md:p-8 flex flex-col gap-6">
      {/* Header — flex-wrap keeps title + badge from overflowing on tiny screens */}
      <header className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-display font-bold tracking-widest text-slate-100 uppercase">
          Speedometer
        </h1>
        <ConnectionStatus status={status} />
      </header>

      {/* Main grid — stacks vertically on mobile, side-by-side on md+ */}
      <main className="flex flex-col md:flex-row gap-6 flex-1">
        {/* Left — gauge centred, full-width on mobile */}
        <section className="flex items-center justify-center w-full md:w-auto">
          <SpeedometerGauge speed={currentSpeed} maxSpeed={200} size={gaugeSize} />
        </section>

        {/* Right — stats + chart */}
        <section className="flex flex-col gap-6 flex-1 min-w-0">
          <SpeedStats
            currentSpeed={currentSpeed}
            maxSpeed={maxSpeed}
            avgSpeed={avgSpeed}
            minSpeed={minSpeed}
          />
          <div className="flex-1 rounded-xl border border-slate-700 bg-slate-800/60 p-4">
            <p className="text-xs font-mono text-slate-400 mb-2 tracking-widest uppercase">
              Speed — last 60 readings
            </p>
            <SpeedChart history={history} />
          </div>
        </section>
      </main>
    </div>
  );
}
