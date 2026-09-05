// ─── Canvas setup & coordinate helpers ──────────────────────
import { CANVAS_W, CANVAS_H, UNIT_PX, PLAT_H, PLAYER, BAR_SLOTS, BAR_ROWS, BAR_ROW_H } from './constants.js';
import { gameCanvas } from './dom.js';

/** Main game screen canvas. */
export const canvas = gameCanvas;
/** 2D rendering context of the game canvas. */
export const ctx   = canvas.getContext('2d');
canvas.width  = CANVAS_W;
canvas.height = CANVAS_H;

/**
 * Pre-rendered static bar layer (background + empty-slot grid) at device
 * resolution. Rebuilt once per resize so drawBar() is a single blit plus
 * filled cells only. Null until the first resize.
 * @type {HTMLCanvasElement|null}
 */
export let barStatic = null;

/**
 * Re-renders the static bar layer (background, border, and empty-slot grid)
 * at the current device resolution.
 */
function buildBarStatic() {
  const barH = BAR_ROW_H * BAR_ROWS;
  const s = canvas.height / CANVAS_H;
  barStatic = document.createElement('canvas');
  barStatic.width  = canvas.width;
  barStatic.height = Math.max(1, Math.round(barH * s));
  const c = barStatic.getContext('2d');
  c.scale(s, s);
  c.fillStyle = 'rgba(0,0,0,0.5)';
  c.fillRect(0, 0, CANVAS_W, barH);
  c.strokeStyle = 'rgba(255,255,255,0.2)';
  c.lineWidth = 1;
  c.strokeRect(0, 0, CANVAS_W, barH);
  const slotW = CANVAS_W / BAR_SLOTS;
  c.strokeStyle = 'rgba(255,255,255,0.08)';
  for (let row = 0; row < BAR_ROWS; row++) {
    const sy = (BAR_ROWS - 1 - row) * BAR_ROW_H;
    for (let col = 0; col < BAR_SLOTS; col++) c.strokeRect(col * slotW, sy, slotW, BAR_ROW_H);
  }
}

/** Backing-store size (device px) last applied to the canvas. */
let lastW = 0, lastH = 0;
/** Pending debounced resize timer id. */
let resizeTimer = null;

// ─── Adaptive resolution ────────────────────────────────────
// External load (other tabs sharing the GPU/CPU, browser work, thermal
// throttling) can push frame time past the frame budget even though the
// game code is fast. When that persists, drop the backing-store scale to
// buy rendering headroom; when it clears, restore the full quality.

/** Backing-store scale levels, highest first (never above device DPR). */
const DPR_LEVELS = [1.5, 1.0];
/** Current level index into DPR_LEVELS (0 = highest quality). */
let dprLevel = 0;
/** EMA of recent frame times in ms (0 = not yet primed). */
let frameEma = 0;
/** Consecutive frames with the EMA above / below the thresholds. */
let slowFrames = 0, fastFrames = 0;
/** Frames since the last level change (change cooldown). */
let framesSinceChange = 0;

/**
 * Feeds one raw frame time (ms) into the adaptive-scale controller.
 * Call once per animation frame. Sustained sub-60fps drops the scale
 * (more headroom); sustained headroom restores it. Stalls over 250 ms
 * (tab switches) are ignored — they are not a rendering signal.
 * @param {number} ms - Raw frame time in milliseconds.
 */
export function reportFrameTime(ms) {
  framesSinceChange++;
  if (ms > 250) return;
  frameEma = frameEma ? frameEma * 0.9 + ms * 0.1 : ms;
  if (frameEma > 17)      { slowFrames++; fastFrames = 0; } // sustained <60fps
  else if (frameEma < 12) { fastFrames++; slowFrames = 0; } // comfortable headroom
  else                    { slowFrames = 0; fastFrames = 0; }
  if (framesSinceChange < 120) return; // cooldown: ~2s between changes
  if (slowFrames > 60 && dprLevel < DPR_LEVELS.length - 1) {
    dprLevel++; slowFrames = 0; framesSinceChange = 0;
    applySize();
  } else if (fastFrames > 300 && dprLevel > 0) {
    dprLevel--; fastFrames = 0; framesSinceChange = 0;
    applySize();
  }
}

/**
 * Matches the canvas backing store to its CSS-rendered size and re-renders
 * the static bar layer.
 *
 * CSS owns the canvas's layout size (#game in style.css: a square sized from
 * viewport units); JS only reads that size and matches the backing store.
 * Never write canvas.style.width/height here: an earlier version did, and
 * its value (innerHeight-based) disagreed with the CSS value (100vh-based)
 * on mobile, so every write re-laid-out the page and re-fired 'resize' — a
 * self-sustaining loop that profiled as ~100 applies/s, each a multi-ms
 * canvas reallocation (the recurring few-ms hitches). The canvas is not
 * flex-stretched (explicit min() width + aspect-ratio), so measuring it
 * cannot feed back.
 */
function applySize() {
  // The scale is min(device DPR, current adaptive level): on DPR-1 displays
  // both levels are 1, so the controller is a harmless no-op there.
  const dpr = Math.min(window.devicePixelRatio || 1, DPR_LEVELS[dprLevel]);
  // clientWidth can be 0 before the first layout; fall back to logical size.
  const pw = Math.max(1, Math.round((canvas.clientWidth || CANVAS_W) * dpr));
  const ph = Math.max(1, Math.round((canvas.clientHeight || CANVAS_H) * dpr));
  if (pw === lastW && ph === lastH) return; // nothing changed — skip the rebuild
  lastW = pw; lastH = ph;
  canvas.width  = pw;
  canvas.height = ph;
  ctx.setTransform(pw / CANVAS_W, 0, 0, ph / CANVAS_H, 0, 0);
  buildBarStatic();
}

/**
 * Debounced window-resize handler. Mobile browsers fire 'resize'
 * repeatedly as the address bar shows/hides; apply only once it settles.
 */
function onResize() {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(applySize, 120);
}
window.addEventListener('resize', onResize);
// Match the backing store once on load.
applySize();

/**
 * Pre-rendered player body sprite. The player occupies a single tile and its
 * colour is fixed, so it is rendered once at 2x density and blit-scaled each
 * frame. Drawing the (velocity-offset) eyes is done per frame in render.js.
 * @type {HTMLCanvasElement}
 */
export const playerSprite = document.createElement('canvas');
playerSprite.width  = PLAYER * UNIT_PX * 2;
playerSprite.height = PLAYER * UNIT_PX * 2;
{
  const c  = playerSprite.getContext('2d');
  c.scale(2, 2);
  const ps = PLAYER * UNIT_PX;
  const g = c.createLinearGradient(0, 0, 0, ps);
  g.addColorStop(0, '#e94560');
  g.addColorStop(1, '#ff6b6b');
  c.fillStyle = g;
  c.fillRect(0, 0, ps, ps);
}

/**
 * Pre-rendered platform sprites, one per width (index = platform width,
 * 1..6). All non-ground platforms share the same height and vertical
 * gradient, so each is rendered once at 2x density for crispness and
 * blitted 1:1 in width per platform — no per-frame GPU downscale of an
 * oversized source (width-1 platforms used to scale a 6-unit sprite).
 * @type {Array<HTMLCanvasElement>}
 */
export const platSprites = [null]; // slot 0 unused; index = platform width
{
  const sh = PLAT_H * UNIT_PX;
  for (let w = 1; w <= 6; w++) {
    const cv = document.createElement('canvas');
    cv.width  = w * UNIT_PX * 2;
    cv.height = Math.ceil(sh * 2);
    const c = cv.getContext('2d');
    c.scale(2, 2);
    const g = c.createLinearGradient(0, 0, 0, sh);
    g.addColorStop(0, '#0f3460');
    g.addColorStop(1, '#533483');
    c.fillStyle = g;
    c.fillRect(0, 0, w * UNIT_PX, sh);
    c.fillStyle = '#e94560';
    c.fillRect(0, 0, w * UNIT_PX, 3);
    platSprites[w] = cv;
  }
}

/**
 * Converts a world y coordinate to a screen y coordinate.
 * Higher world y = higher on screen (smaller screen y).
 * @param {number} y - World y coordinate (in world units).
 * @param {number} camY - Camera y in world units (pass the interpolated value when rendering between ticks).
 * @returns {number} Screen y coordinate in logical pixels.
 */
export function toScreenY(y, camY) { return CANVAS_H - (y - camY) * UNIT_PX; }

/**
 * Converts a world x coordinate to a screen x coordinate.
 * @param {number} x - World x coordinate (in world units).
 * @returns {number} Screen x coordinate in logical pixels.
 */
export function toScreenX(x) { return x * UNIT_PX; }
