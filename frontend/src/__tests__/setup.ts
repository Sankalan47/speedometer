/**
 * __tests__/setup.ts
 * Global test setup for all Vitest suites.
 */

/// <reference types="vitest/globals" />
import '@testing-library/jest-dom/vitest';

// Make rAF synchronous so canvas animation loops run without real timers
globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number => {
  cb(0);
  return 0;
};
globalThis.cancelAnimationFrame = () => undefined;

// JSDOM does not implement canvas; provide a full 2D context stub
const ctxMock = {
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  fillText: vi.fn(),
  set font(_: string) {},
  set fillStyle(_: string) {},
  set strokeStyle(_: string) {},
  set lineWidth(_: number) {},
  set lineCap(_: string) {},
  set shadowColor(_: string) {},
  set shadowBlur(_: number) {},
  set textAlign(_: string) {},
  set textBaseline(_: string) {},
};

HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(ctxMock) as typeof HTMLCanvasElement.prototype.getContext;

// ResizeObserver stub (required by Recharts ResponsiveContainer)
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
