// ─── Dice helper ────────────────────────────────────────────
import { WIDTH_TIERS, REACH_TIERS, BLOCK_COLORS } from './constants.js';

/**
 * Rolls a random integer in the inclusive range [min, max].
 * @param {number} min - Minimum possible value (inclusive).
 * @param {number} max - Maximum possible value (inclusive).
 * @returns {number} A random integer between min and max.
 */
export function roll(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

/**
 * Looks up the tier for a given altitude and returns its value range.
 * @param {number} alt - Current altitude.
 * @param {Array<[number, number, number]>} tiers - Tiers of `[minAltitude, min, max]`.
 * @returns {[number, number]} The `[min, max]` range of the matched tier.
 */
export function tierRange(alt, tiers) {
  let r = tiers[0];
  for (const t of tiers) if (alt >= t[0]) r = t;
  return [r[1], r[2]];
}

/**
 * Width range for a platform at the given altitude.
 * @param {number} alt - Current altitude.
 * @returns {[number, number]} `[minWidth, maxWidth]` in world units.
 */
export const widthRange = (alt) => tierRange(alt, WIDTH_TIERS);

/**
 * Reachable horizontal distance range for a platform at the given altitude.
 * @param {number} alt - Current altitude.
 * @returns {[number, number]} `[minDistance, maxDistance]` in world units.
 */
export const reachRange = (alt) => tierRange(alt, REACH_TIERS);

/**
 * Fair coin flip.
 * @returns {boolean} Randomly true or false (50/50).
 */
export function coin() { return Math.random() < 0.5; }

/**
 * Picks a random block color.
 * @returns {string} A random CSS color from the block palette.
 */
export function randColor() { return BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)]; }
