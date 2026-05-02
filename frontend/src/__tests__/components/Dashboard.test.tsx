/**
 * __tests__/components/Dashboard.test.tsx
 * TDD spec for the top-level layout component.
 * useSpeedStream is mocked so Dashboard is tested in isolation.
 */

import { render, screen, act } from '@testing-library/react';
import { Dashboard } from '../../components/Dashboard';

const defaultStreamReturn = {
  currentSpeed: 0,
  history: [],
  status: 'CONNECTING' as const,
  maxSpeed: 0,
  minSpeed: 0,
  avgSpeed: 0,
};

vi.mock('../../hooks/useSpeedStream', () => ({
  useSpeedStream: vi.fn(),
}));

import { useSpeedStream } from '../../hooks/useSpeedStream';
const mockUseSpeedStream = useSpeedStream as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockUseSpeedStream.mockReturnValue(defaultStreamReturn);
  // Reset window width to desktop default
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
});

describe('Dashboard component', () => {
  describe('layout rendering', () => {
    it('should render the "Speedometer" heading', () => {
      render(<Dashboard />);
      expect(screen.getByText(/speedometer/i)).toBeInTheDocument();
    });

    it('should render the ConnectionStatus component', () => {
      render(<Dashboard />);
      // CONNECTING status renders this text
      expect(screen.getByText('CONNECTING...')).toBeInTheDocument();
    });

    it('should render the SpeedometerGauge canvas', () => {
      const { container } = render(<Dashboard />);
      expect(container.querySelector('canvas')).toBeInTheDocument();
    });

    it('should render the "Current" stat card label', () => {
      render(<Dashboard />);
      expect(screen.getByText(/current/i)).toBeInTheDocument();
    });

    it('should render the "Speed — last 60 readings" chart label', () => {
      render(<Dashboard />);
      expect(screen.getByText(/last 60 readings/i)).toBeInTheDocument();
    });
  });

  describe('given useSpeedStream returns status=CONNECTED', () => {
    it('should pass CONNECTED status to ConnectionStatus', () => {
      mockUseSpeedStream.mockReturnValue({ ...defaultStreamReturn, status: 'CONNECTED' });
      render(<Dashboard />);
      expect(screen.getByText('LIVE')).toBeInTheDocument();
    });
  });

  describe('given useSpeedStream returns currentSpeed=95', () => {
    it('should pass speed=95 to SpeedometerGauge (aria-label)', () => {
      mockUseSpeedStream.mockReturnValue({ ...defaultStreamReturn, currentSpeed: 95 });
      const { container } = render(<Dashboard />);
      const canvas = container.querySelector('canvas')!;
      expect(canvas.getAttribute('aria-label')).toContain('95');
    });

    it('should display currentSpeed=95 in the stat cards', () => {
      mockUseSpeedStream.mockReturnValue({ ...defaultStreamReturn, currentSpeed: 95 });
      render(<Dashboard />);
      expect(screen.getByText('95.0')).toBeInTheDocument();
    });
  });

  describe('responsive gauge sizing', () => {
    it('given window.innerWidth=400 (mobile), gaugeSize should be <= 320', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 400 });
      const { container } = render(<Dashboard />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      const width = parseInt(canvas.style.width, 10);
      expect(width).toBeLessThanOrEqual(320);
    });

    it('given window.innerWidth=1024 (desktop), gaugeSize should be 400', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
      const { container } = render(<Dashboard />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas.style.width).toBe('400px');
    });

    it('should update gaugeSize on window resize', () => {
      const { container } = render(<Dashboard />);
      act(() => {
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 300 });
        window.dispatchEvent(new Event('resize'));
      });
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      const width = parseInt(canvas.style.width, 10);
      expect(width).toBeLessThanOrEqual(320);
    });

    it('should remove the resize event listener on unmount', () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = render(<Dashboard />);
      unmount();
      expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });

  describe('data flow to child components', () => {
    it('should pass history to SpeedChart (chart container renders)', () => {
      const history = [{ id: 1, speed_kmh: 80, recorded_at: '2025-01-01T10:00:00.000Z', sensor_id: 's1' }];
      mockUseSpeedStream.mockReturnValue({ ...defaultStreamReturn, history });
      const { container } = render(<Dashboard />);
      // Recharts ResponsiveContainer renders in JSDOM without SVG (zero dimensions)
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('should pass maxSpeed to SpeedStats', () => {
      mockUseSpeedStream.mockReturnValue({ ...defaultStreamReturn, maxSpeed: 150 });
      render(<Dashboard />);
      expect(screen.getByText('150.0')).toBeInTheDocument();
    });
  });
});
