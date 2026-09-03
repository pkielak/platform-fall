// Functional tests for the physics / reachability design rule.
//
// The SPEC's Design Rule requires that every dice-generated platform
// (<= 6 units up and <= 6 units sideways) is reachable in a single jump
// given the physics constants. These tests simulate an actual jump
// trajectory and verify that invariant, guarding against regression if
// a constant is retuned.
import { test, describe, expect } from 'vitest';
import { GRAVITY, JUMP_V, MAX_SPEED } from '../js/constants.js';

/**
 * Simulates a jump trajectory starting at the foot of a platform.
 * @param {number} vx - Horizontal velocity (u/frame), constant during flight.
 * @param {number} vy0 - Initial upward velocity (u/frame) = JUMP_V.
 * @returns {{peakHeight: number, maxSpan: number}}
 */
function simulateJump(vx, vy0 = JUMP_V) {
  let x = 0, y = 0, vy = vy0, peak = 0, maxSpan = 0;
  let frames = 0;
  do {
    x += vx;
    vy -= GRAVITY;
    y += vy;
    if (y > peak) peak = y;
    if (y > 0) maxSpan = Math.max(maxSpan, x);
    frames++;
    if (frames > 100000) break;
  } while (y > 0);
  return { peakHeight: peak, maxSpan };
}

describe('reachability design rule', () => {
  test('max jump height reaches at least 6 units', () => {
    const { peakHeight } = simulateJump(0);
    const analytical = JUMP_V * JUMP_V / (2 * GRAVITY);
    // Discrete 60fps sampling peaks one frame before the analytical apex;
    // the true apex is at/above the analytical value.
    expect(peakHeight).toBeGreaterThanOrEqual(6);
    expect(peakHeight).toBeLessThanOrEqual(analytical + JUMP_V);
  });

  test('sideways travel reaches at least 6 units at the same height', () => {
    const { maxSpan } = simulateJump(MAX_SPEED);
    expect(maxSpan).toBeGreaterThanOrEqual(6);
  });

  test('worst corner (6 up + 6 sideways) is reachable with max horizontal speed', () => {
    const t = 6 / MAX_SPEED;
    const heightAtSideways = JUMP_V * t - 0.5 * GRAVITY * t * t;
    expect(heightAtSideways).toBeGreaterThanOrEqual(6);
  });

  test('the trajectory clears 6 vertical units while traveling 6 sideways', () => {
    const vx = MAX_SPEED;
    let x = 0, y = 0, vy = JUMP_V;
    let cleared = false;
    for (let f = 0; f < 1000; f++) {
      x += vx; vy -= GRAVITY; y += vy;
      if (x >= 6 && y >= 6) { cleared = true; break; }
      if (y < 0) break;
    }
    expect(cleared).toBe(true);
  });
});
