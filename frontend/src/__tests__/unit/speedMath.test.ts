/**
 * __tests__/unit/speedMath.test.ts
 * TDD spec for pure math utilities.
 */

import { lerp, clamp, speedToAngle, average } from '../../utils/speedMath';

describe('lerp', () => {
  describe('given t=0', () => {
    it('should return a unchanged', () => {
      expect(lerp(10, 100, 0)).toBe(10);
    });
  });

  describe('given t=1', () => {
    it('should return b unchanged', () => {
      expect(lerp(10, 100, 1)).toBe(100);
    });
  });

  describe('given t=0.5', () => {
    it('should return the midpoint of a and b', () => {
      expect(lerp(0, 100, 0.5)).toBe(50);
    });
  });

  describe('given a equals b', () => {
    it('should return a for any t', () => {
      expect(lerp(60, 60, 0.3)).toBe(60);
    });
  });

  describe('given t outside [0,1]', () => {
    it('t=2 should extrapolate beyond b (lerp itself does not clamp)', () => {
      expect(lerp(0, 100, 2)).toBe(200);
    });
  });

  describe('floating point precision', () => {
    it('lerp(0, 100, 0.08) should be approximately 8', () => {
      expect(lerp(0, 100, 0.08)).toBeCloseTo(8, 5);
    });
  });
});

describe('clamp', () => {
  describe('given val is below min', () => {
    it('should return min', () => {
      expect(clamp(-1, 0, 300)).toBe(0);
    });
  });

  describe('given val is above max', () => {
    it('should return max', () => {
      expect(clamp(301, 0, 300)).toBe(300);
    });
  });

  describe('given val equals min', () => {
    it('should return min (inclusive lower bound)', () => {
      expect(clamp(0, 0, 300)).toBe(0);
    });
  });

  describe('given val equals max', () => {
    it('should return max (inclusive upper bound)', () => {
      expect(clamp(300, 0, 300)).toBe(300);
    });
  });

  describe('given val is within range', () => {
    it('should return val unchanged', () => {
      expect(clamp(150, 0, 300)).toBe(150);
    });
  });
});

describe('speedToAngle', () => {
  describe('given speed=0 and default maxSpeed=200', () => {
    it('should return -135 degrees (left-most position)', () => {
      expect(speedToAngle(0, 200)).toBe(-135);
    });
  });

  describe('given speed equals maxSpeed', () => {
    it('should return 135 degrees (right-most position)', () => {
      expect(speedToAngle(200, 200)).toBe(135);
    });
  });

  describe('given speed is half of maxSpeed', () => {
    it('should return 0 degrees (center position)', () => {
      expect(speedToAngle(100, 200)).toBe(0);
    });
  });

  describe('given speed exceeds maxSpeed', () => {
    it('should clamp to 135 degrees', () => {
      expect(speedToAngle(999, 200)).toBe(135);
    });
  });

  describe('given speed is negative', () => {
    it('should clamp to -135 degrees', () => {
      expect(speedToAngle(-50, 200)).toBe(-135);
    });
  });

  describe('given a custom maxSpeed of 300', () => {
    it('speed=300 should return 135 degrees', () => {
      expect(speedToAngle(300, 300)).toBe(135);
    });

    it('speed=150 should return 0 degrees', () => {
      expect(speedToAngle(150, 300)).toBe(0);
    });
  });

  describe('total sweep invariant', () => {
    it('the difference between max and min angle should be 270 degrees', () => {
      const sweep = speedToAngle(200, 200) - speedToAngle(0, 200);
      expect(sweep).toBe(270);
    });
  });
});

describe('average', () => {
  describe('given an empty array', () => {
    it('should return 0', () => {
      expect(average([])).toBe(0);
    });
  });

  describe('given a single-element array', () => {
    it('should return that element', () => {
      expect(average([42])).toBe(42);
    });
  });

  describe('given [0, 100, 200]', () => {
    it('should return 100', () => {
      expect(average([0, 100, 200])).toBe(100);
    });
  });

  describe('given all zeros', () => {
    it('should return 0', () => {
      expect(average([0, 0, 0])).toBe(0);
    });
  });

  describe('given all identical values', () => {
    it('should return that value', () => {
      expect(average([60, 60, 60, 60])).toBe(60);
    });
  });

  describe('given floating-point values', () => {
    it('should return the correct mean', () => {
      expect(average([1.5, 2.5])).toBeCloseTo(2.0, 5);
    });
  });
});
