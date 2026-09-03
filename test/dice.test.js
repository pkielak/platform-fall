// Functional tests for the dice / tier lookup logic.
import { test, describe, expect } from 'vitest';
import { roll, tierRange, widthRange, reachRange, coin, randColor } from '../js/dice.js';

describe('dice helpers', () => {
  test('roll(min, max) stays within the inclusive range and returns integers', () => {
    for (let i = 0; i < 500; i++) {
      const v = roll(3, 6);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(6);
    }
  });

  test('roll(min, min) always returns that single value', () => {
    for (let i = 0; i < 100; i++) expect(roll(4, 4)).toBe(4);
  });

  test('tierRange picks the tier matching the greatest altitude <= alt', () => {
    const tiers = [[0, 5, 6], [500, 4, 6]];
    expect(tierRange(0, tiers)).toEqual([5, 6]);
    expect(tierRange(500, tiers)).toEqual([4, 6]);
    expect(tierRange(1200, [[0, 5, 6], [500, 4, 6], [1000, 4, 5]])).toEqual([4, 5]);
  });

  test('widthRange narrows with altitude (difficulty ramps up)', () => {
    expect(widthRange(0)).toEqual([5, 6]);
    expect(widthRange(1500)).toEqual([3, 5]);
    expect(widthRange(4000)).toEqual([1, 2]);
    for (let alt = 0; alt < 100000; alt += 1000) {
      const [lo, hi] = widthRange(alt);
      expect(lo).toBeGreaterThanOrEqual(1);
      expect(hi).toBeLessThanOrEqual(24);
      expect(lo).toBeLessThanOrEqual(hi);
    }
  });

  test('reachRange follows the reach tiers', () => {
    expect(reachRange(0)).toEqual([2, 3]);
    expect(reachRange(1000)).toEqual([2, 4]);
    expect(reachRange(3000)).toEqual([4, 6]);
  });

  test('reachRange never exceeds the hard 6-unit reach constraint', () => {
    for (let alt = 0; alt < 100000; alt += 500) {
      const [, hi] = reachRange(alt);
      expect(hi).toBeLessThanOrEqual(6);
    }
  });

  test('coin() returns a boolean', () => {
    for (let i = 0; i < 100; i++) expect(typeof coin()).toBe('boolean');
  });

  test('randColor() returns a color from the palette', () => {
    const palette = ['#e94560', '#ff6b6b', '#533483', '#0f3460', '#16c79a', '#f5a623'];
    for (let i = 0; i < 100; i++) expect(palette).toContain(randColor());
  });
});
