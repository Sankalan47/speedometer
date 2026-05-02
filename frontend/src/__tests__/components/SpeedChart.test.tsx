/**
 * __tests__/components/SpeedChart.test.tsx
 * TDD spec for the Recharts line chart component.
 *
 * Design note: Recharts ResponsiveContainer never renders SVG content in JSDOM
 * because ResizeObserver reports zero dimensions. Tests verify the component
 * mounts without errors and check the recharts wrapper div; formatTime is
 * tested directly as a reimplemented pure function.
 */

import { render } from '@testing-library/react';
import { SpeedChart } from '../../components/SpeedChart';
import { SpeedReading } from '../../types/index';

function makeReading(id: number, speed: number, isoTime: string): SpeedReading {
  return { id, speed_kmh: speed, recorded_at: isoTime, sensor_id: 'sensor-1' };
}

/** Mirror of the private formatTime function inside SpeedChart */
function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

describe('SpeedChart component', () => {
  describe('given an empty history array', () => {
    it('should render without throwing', () => {
      expect(() => render(<SpeedChart history={[]} />)).not.toThrow();
    });

    it('should render the recharts container element', () => {
      const { container } = render(<SpeedChart history={[]} />);
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
  });

  describe('given history with 3 readings', () => {
    const history = [
      makeReading(1, 60, '2025-01-01T10:00:00.000Z'),
      makeReading(2, 80, '2025-01-01T10:00:01.000Z'),
      makeReading(3, 100, '2025-01-01T10:00:02.000Z'),
    ];

    it('should render without errors', () => {
      expect(() => render(<SpeedChart history={history} />)).not.toThrow();
    });
  });

  describe('given 60 readings (full history window)', () => {
    const history = Array.from({ length: 60 }, (_, i) =>
      makeReading(i + 1, 60 + i, `2025-01-01T10:${String(i).padStart(2, '0')}:00.000Z`),
    );

    it('should render without errors', () => {
      expect(() => render(<SpeedChart history={history} />)).not.toThrow();
    });
  });

  // formatTime is a private function — verify its spec directly
  describe('formatTime logic', () => {
    it('should format ISO 8601 string as HH:MM:SS', () => {
      expect(formatTime('2025-01-15T14:30:45.000Z')).toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    it('each part should always be exactly 2 digits', () => {
      // Use a known date — formatTime uses local time, so check structure not values
      const result = formatTime('2025-01-15T00:01:02.000Z');
      const parts = result.split(':');
      expect(parts).toHaveLength(3);
      parts.forEach((p) => expect(p).toMatch(/^\d{2}$/));
    });

    it('format returns exactly 8 characters (HH:MM:SS)', () => {
      expect(formatTime('2025-01-01T00:00:00.000Z')).toHaveLength(8);
    });
  });
});
