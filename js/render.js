// ─── Rendering ──────────────────────────────────────────────
// Pure renderer: reads shared game state and draws one frame. Nothing here
// mutates state. All per-frame motion is interpolated locally between the
// previous and current simulation tick (the classic fixed-timestep pattern),
// so the image is smooth at any display refresh rate — 60Hz, 120Hz, 144Hz.

import {
  CANVAS_W, CANVAS_H, MAP_W, UNIT_PX, PLAT_H, PLAYER,
  BAR_SLOTS, BAR_ROWS, BAR_ROW_H, BAR_RESERVED,
} from './constants.js';
import { ctx, barStatic, platSprites, playerSprite, toScreenX, toScreenY } from './canvas.js';
import { state } from './game.js';

/** Cached sky gradient; rebuilt only when the altitude tint changes. */
let skyGrad = null;
/** Key (packed rgb triplet of the top color) the cached sky gradient was built for. */
let skyGradKey = -1;
/** Reusable row*BAR_SLOTS+col -> anim lookup, reused across drawBar calls. */
let animLookup = null;

/**
 * Linearly interpolates between a previous-tick and current-tick value.
 * @param {number} prev - Value at the previous tick.
 * @param {number} cur - Value at the current tick.
 * @param {number} t - Interpolation factor in [0, 1] (0 = prev, 1 = cur).
 * @returns {number} The interpolated value.
 */
function lerp(prev, cur, t) { return prev + (cur - prev) * t; }

/**
 * Renders one full frame: sky, grid, walls, platforms, falling blocks,
 * the player, and the power bar.
 *
 * Every animated element (camera, player, falling blocks, block fades) is
 * blended between its previous-tick and current-tick value using `alpha`,
 * so rendering is decoupled from the fixed 60Hz simulation and stays
 * fluid regardless of the display's refresh rate.
 * @param {number} alpha - Fraction of a tick elapsed since the last simulation update, in [0, 1]. Defaults to 1 (no interpolation).
 */
export function draw(alpha = 1) {
  const { player, camera, bar, alive, maxAlt, platforms } = state;
  // When dead the simulation is frozen, but prev/current can still differ
  // from the death tick — render the final tick exactly to avoid drift.
  const t = alive ? Math.min(1, Math.max(0, alpha)) : 1;
  const camY = lerp(camera.prevY, camera.y, t);

  // Sky gradient (cached — only rebuilt when the altitude tint changes)
  const altNorm = Math.min(maxAlt / 100, 1);
  const r1 = Math.round(22 + altNorm * 20);
  const g1 = Math.round(33 + altNorm * 10);
  const b1 = Math.round(62 + altNorm * 30);
  // Packed numeric key (avoids per-frame string allocation; channels are
  // always < 100 so 2 decimal digits each are unambiguous).
  const skyKey = r1 * 10000 + g1 * 100 + b1;
  if (skyKey !== skyGradKey) {
    skyGradKey = skyKey;
    skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    skyGrad.addColorStop(0, `rgb(${r1},${g1},${b1})`);
    skyGrad.addColorStop(1, '#1a1a2e');
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Grid overlay (all lines in one path, single stroke).
  // Vertical lines are static; horizontal lines scroll with the camera.
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let gx = 0; gx <= MAP_W; gx++) {
    const sx = toScreenX(gx);
    ctx.moveTo(sx, 0); ctx.lineTo(sx, CANVAS_H);
  }
  const gridStart = Math.floor(camY) - 2;
  const gridEnd   = Math.ceil(camY + CANVAS_H / UNIT_PX) + 2;
  for (let gy = gridStart; gy <= gridEnd; gy++) {
    const sy = toScreenY(gy, camY);
    ctx.moveTo(0, sy); ctx.lineTo(CANVAS_W, sy);
  }
  ctx.stroke();

  // Walls (all 4 edges)
  ctx.strokeStyle = '#e94560';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, CANVAS_W - 3, CANVAS_H - 3);

  // Platforms
  for (const p of platforms) {
    const sx = toScreenX(p.x);
    // p.y is the TOP surface of the platform in world space
    const syTop = toScreenY(p.y, camY);
    const sh = p.h * UNIT_PX;
    const sw = p.w * UNIT_PX;
    if (syTop + sh < 0 || syTop > CANVAS_H) continue;

    if (p.ground) {
      ctx.fillStyle = '#0f3460';
      ctx.fillRect(sx, syTop, sw, sh);
      ctx.fillStyle = '#e94560';
      ctx.fillRect(sx, syTop, sw, 3);
    } else {
      // 1:1 width blit from the matching pre-rendered sprite (no scaling)
      ctx.drawImage(platSprites[p.w] || platSprites[6], sx, syTop, sw, sh);
    }
  }

  // Falling blocks (platform → bar), interpolated between ticks
  for (const f of bar.falling) {
    ctx.globalAlpha = Math.min(1, lerp(f.prevT, f.t, t) * 2);
    ctx.fillStyle = f.color;
    ctx.fillRect(f.x, lerp(f.prevY, f.y, t), f.w, UNIT_PX * PLAT_H);
    ctx.globalAlpha = 1;
  }

  // Player — player.y is the BOTTOM; player occupies [y, y+1] upward.
  // Body is a pre-rendered sprite; only the small eyes are drawn per frame,
  // which avoids allocating a gradient every frame.
  if (alive) {
    const px = toScreenX(lerp(player.prevX, player.x, t));
    const pyTop = toScreenY(lerp(player.prevY, player.y, t) + PLAYER, camY);
    const ps = PLAYER * UNIT_PX;

    // Body (blit from cached sprite)
    ctx.drawImage(playerSprite, px, pyTop, ps, ps);

    // Eyes
    const eyeOffX = player.vx * 3;
    const eyeY = pyTop + ps * 0.3;
    ctx.fillStyle = '#fff';
    ctx.fillRect(px + ps * 0.2 + eyeOffX, eyeY, ps * 0.2, ps * 0.2);
    ctx.fillRect(px + ps * 0.6 + eyeOffX, eyeY, ps * 0.2, ps * 0.2);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(px + ps * 0.25 + eyeOffX, eyeY + 3, ps * 0.1, ps * 0.1);
    ctx.fillRect(px + ps * 0.65 + eyeOffX, eyeY + 3, ps * 0.1, ps * 0.1);
  }

  // Bar (drawn in reserved area at bottom)
  drawBar(bar, t);
}

/**
 * Draws the power bar in the reserved area at the bottom of the canvas:
 * the pre-rendered static background plus all filled cells (with fade
 * animations for freshly placed blocks).
 * @param {{slots: Array<Array<string|null>>, anims: Array<{row: number, col: number, t: number, prevT: number, color: string}>}} bar - Bar state from game state.
 * @param {number} t - Interpolation factor in [0, 1] for the block-fade animations.
 */
function drawBar(bar, t) {
  const barY = CANVAS_H - BAR_RESERVED + 8;
  const slotW = CANVAS_W / BAR_SLOTS;

  // Static background + empty-slot grid (pre-rendered per resize)
  ctx.drawImage(barStatic, 0, barY, CANVAS_W, BAR_ROW_H * BAR_ROWS);

  // Prebuild an anim lookup once per draw (avoids a .find() closure per cell).
  if (!animLookup) animLookup = new Array(BAR_ROWS * BAR_SLOTS);
  animLookup.fill(null);
  for (const a of bar.anims) animLookup[a.row * BAR_SLOTS + a.col] = a;

  // Filled cells only (row 0 = bottom visually)
  for (let row = 0; row < BAR_ROWS; row++) {
    const sy = barY + (BAR_ROWS - 1 - row) * BAR_ROW_H;
    for (let col = 0; col < BAR_SLOTS; col++) {
      const color = bar.slots[row][col];
      if (!color) continue;
      const sx = col * slotW;
      const anim = animLookup[row * BAR_SLOTS + col];
      if (anim) {
        ctx.globalAlpha = Math.max(0, lerp(anim.prevT, anim.t, t));
        ctx.fillStyle = anim.color;
      } else {
        ctx.fillStyle = color;
      }
      ctx.fillRect(sx + 1, sy + 1, slotW - 2, BAR_ROW_H - 2);
      if (anim) ctx.globalAlpha = 1;
    }
  }
}
