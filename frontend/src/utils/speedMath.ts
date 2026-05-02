/**
 * utils/speedMath.ts
 * Pure math helpers for speed display and gauge animation.
 *
 * Design note: Pure functions with no side-effects make these trivially
 * testable and reusable across components.
 */

/**
 * Linear interpolation between a and b by factor t ∈ [0, 1].
 * Used for smooth needle easing — t=0.08 gives a snappy but smooth feel.
 *
 * @param a - Start value.
 * @param b - End value.
 * @param t - Interpolation factor (0 = a, 1 = b).
 */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Clamp val to the inclusive range [min, max].
 *
 * @param val - Value to clamp.
 * @param min - Lower bound.
 * @param max - Upper bound.
 */
export const clamp = (val: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, val));

/**
 * Convert a speed value to a gauge needle angle in degrees.
 * The gauge sweeps 270° from -135° (left, 0 km/h) to +135° (right, maxSpeed).
 *
 * @param speed - Current speed in km/h.
 * @param maxSpeed - Top of the gauge range (default 200).
 * @returns Angle in degrees.
 */
export const speedToAngle = (speed: number, maxSpeed = 200): number => {
  const ratio = clamp(speed / maxSpeed, 0, 1);
  return -135 + ratio * 270;
};

/**
 * Arithmetic mean of an array of numbers.
 *
 * @param arr - Array of numeric values.
 * @returns Mean, or 0 if the array is empty.
 */
export const average = (arr: number[]): number =>
  arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
