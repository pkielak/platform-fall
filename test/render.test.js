// ─── Render tests ───────────────────────────────────────────
// Verifies the sprite-table contract that draw() relies on. (jsdom's
// canvas stub does not validate drawImage arguments, so an out-of-range
// lookup — e.g. platSprites[6] being undefined for a width-6 platform —
// would only surface as a runtime crash in a real browser.)
import { test, expect } from 'vitest';
import { platSprites, playerSprite } from '../js/canvas.js';
import { draw } from '../js/render.js';
import { init, state } from '../js/game.js';

test('platSprites has a valid canvas for every platform width 1..6', () => {
  for (let w = 1; w <= 6; w++) {
    const s = platSprites[w];
    expect(s, `platSprites[${w}]`).toBeTruthy();
    expect(s.localName).toBe('canvas');
    // sprite pixel width must match the platform width (1:1 blit)
    expect(s.width).toBe(w * 50 * 2); // 2x density pre-render
  }
});

test('playerSprite is a valid canvas', () => {
  expect(playerSprite.localName).toBe('canvas');
  expect(playerSprite.width).toBe(50 * 2);
});

test('draw() runs without throwing for every platform width', () => {
  for (let w = 1; w <= 6; w++) {
    init();
    // Force a single non-ground platform of each width above the ground.
    state.platforms.length = 1; // keep ground only
    state.platforms.push({ x: 2, y: 5, w, h: 0.25, ground: false });
    draw();
  }
});
