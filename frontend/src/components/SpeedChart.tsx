/**
 * components/SpeedChart.tsx
 * Recharts line chart showing the last 60 speed readings.
 *
 * Design note: Y-axis domain is fixed at [0, 220] so the chart does not
 * rescale on every update, which would be visually jarring.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { SpeedReading } from '../types/index';

interface Props {
  history: SpeedReading[];
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

export function SpeedChart({ history }: Props) {
  const data = history.map((r) => ({
    time: formatTime(r.recorded_at),
    speed: r.speed_kmh,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid stroke="#1e2433" strokeDasharray="3 3" />
        <XAxis
          dataKey="time"
          tick={{ fill: '#64748b', fontSize: 10, fontFamily: "'Courier New', monospace" }}
          tickLine={false}
          axisLine={{ stroke: '#1e2433' }}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 220]}
          tick={{ fill: '#64748b', fontSize: 10, fontFamily: "'Courier New', monospace" }}
          tickLine={false}
          axisLine={{ stroke: '#1e2433' }}
          width={36}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
          labelStyle={{ color: '#94a3b8', fontFamily: "'Courier New', monospace", fontSize: 11 }}
          itemStyle={{ color: '#f97316', fontFamily: "'Courier New', monospace", fontSize: 12 }}
          formatter={(val: number) => [`${val.toFixed(1)} km/h`, 'Speed']}
        />
        <ReferenceLine y={200} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.6} />
        <Line
          type="monotone"
          dataKey="speed"
          stroke="#f97316"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
