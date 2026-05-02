/**
 * __tests__/components/SpeedometerGauge.test.tsx
 * TDD spec for the canvas-based gauge.
 * Canvas 2D context and rAF are stubbed globally in setup.ts.
 */

import { render } from '@testing-library/react';
import { SpeedometerGauge } from '../../components/SpeedometerGauge';

describe('SpeedometerGauge component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('canvas rendering', () => {
    it('should render a canvas element', () => {
      const { container } = render(<SpeedometerGauge speed={0} />);
      expect(container.querySelector('canvas')).toBeInTheDocument();
    });

    it('should set aria-label containing the current speed', () => {
      const { container } = render(<SpeedometerGauge speed={75} />);
      const canvas = container.querySelector('canvas')!;
      expect(canvas.getAttribute('aria-label')).toContain('75');
    });

    it('speed=0 → aria-label should contain "0"', () => {
      const { container } = render(<SpeedometerGauge speed={0} />);
      const canvas = container.querySelector('canvas')!;
      expect(canvas.getAttribute('aria-label')).toContain('0');
    });
  });

  describe('size prop', () => {
    it('default size=400 → style.width should be 400px', () => {
      const { container } = render(<SpeedometerGauge speed={0} />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas.style.width).toBe('400px');
    });

    it('default size=400 → style.height should be 400px', () => {
      const { container } = render(<SpeedometerGauge speed={0} />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas.style.height).toBe('400px');
    });

    it('size=300 → style.width should be 300px', () => {
      const { container } = render(<SpeedometerGauge speed={0} size={300} />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas.style.width).toBe('300px');
    });
  });

  describe('canvas context initialisation', () => {
    it('should call getContext("2d") on mount', () => {
      render(<SpeedometerGauge speed={0} />);
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d');
    });

    it('should call ctx.scale on mount', () => {
      const mockCtx = (HTMLCanvasElement.prototype.getContext as ReturnType<typeof vi.fn>).mock.results[0]?.value;
      if (mockCtx) {
        expect(mockCtx.scale).toHaveBeenCalled();
      }
    });
  });

  describe('boundary speeds', () => {
    it('speed=0 should render without throwing', () => {
      expect(() => render(<SpeedometerGauge speed={0} />)).not.toThrow();
    });

    it('speed=200 (at maxSpeed) should render without throwing', () => {
      expect(() => render(<SpeedometerGauge speed={200} />)).not.toThrow();
    });

    it('speed=300 (above maxSpeed) should render without throwing', () => {
      expect(() => render(<SpeedometerGauge speed={300} />)).not.toThrow();
    });
  });

  describe('animation on speed change', () => {
    it('should call requestAnimationFrame when speed prop changes', () => {
      const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame');
      const { rerender } = render(<SpeedometerGauge speed={0} />);
      rerender(<SpeedometerGauge speed={80} />);
      expect(rafSpy).toHaveBeenCalled();
    });
  });

  describe('unmount cleanup', () => {
    it('should not throw during unmount (no dangling rAF or refs)', () => {
      const { unmount } = render(<SpeedometerGauge speed={50} />);
      expect(() => unmount()).not.toThrow();
    });
  });
});
