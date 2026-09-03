// ─── Canvas setup & coordinate helpers ──────────────────────
import { CANVAS_W, CANVAS_H, UNIT_PX, PLAT_H, PLAYER, BAR_SLOTS, BAR_ROWS, BAR_ROW_H } from './constants.js';
import { gameCanvas } from './dom.js';
// camera is read lazily from game state (to avoid using the binding at load time)
import { state } from './game.js';

/** Main game screen canvas. */
export const canvas = gameCanvas;
/** 2D rendering context of the game canvas. */
export const ctx   = canvas.getContext('2d');
canvas.width  = CANVAS_W;
canvas.height = CANVAS_H;

/**
 * Fixed chrome (page decorations) sizes per breakpoint, in CSS px.
 * Must match the CSS paddings/borders of the console frame.
 * @type {{mobile: {w: number, h: number, touch: number}, desktop: {w: number, h: number, touch: number}}}
 */
const CHROME = {
  // touch = bar natural height (flex:1 fill is cosmetic)
  mobile:  { w: 54,  h: 60,  touch: 170 },
  desktop: { w: 154, h: 100, touch: 0   },
};

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

/**
 * Resizes the canvas to the largest square that fits the remaining viewport
 * space, backs it at display resolution (DPR capped at 1.5), and re-renders
 * the static bar layer.
 *
 * The console always fills the viewport width; the screen canvas is sized
 * in CSS px to fit the leftover space.
 * NOTE: never measure flex-stretched elements here (feedback loop).
 */
let resizeTimer = null;
let lastW = 0, lastH = 0;

/**
 * Debounced window-resize handler: resizes the canvas backing store and
 * re-renders the static bar layer once the resize storm settles.
 */
export function resize() {
  // Debounce: mobile browsers fire 'resize' repeatedly as the address bar
  // shows/hides (a few times per second). Apply only once it settles so we
  // don't rebuild the offscreen canvas every few seconds.
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(resize.__apply, 120);
}
resize.__apply = function () {
  const c      = window.innerWidth < 1024 ? CHROME.mobile : CHROME.desktop;
  const availW = window.innerWidth - c.w;
  const availH = window.innerHeight - c.touch - c.h;
  const scale  = Math.max(0.1, Math.min(availW / CANVAS_W, availH / CANVAS_H));
  const cssW   = CANVAS_W * scale;
  const cssH   = CANVAS_H * scale;
  // Back the canvas at display resolution (DPR capped at 1.5) instead of a
  // fixed 1200x1200, then scale the context so game code stays in logical coords.
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const pw = Math.max(1, Math.round(cssW * dpr));
  const ph = Math.max(1, Math.round(cssH * dpr));
  if (pw === lastW && ph === lastH) return; // nothing changed — skip the rebuild
  lastW = pw; lastH = ph;
  canvas.style.width  = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.width  = pw;
  canvas.height = ph;
  ctx.setTransform(pw / CANVAS_W, 0, 0, ph / CANVAS_H, 0, 0);
  buildBarStatic();
};
window.addEventListener('resize', resize);
// Size once on load (synchronously, not via the debounced handler).
resize.__apply();
resize();

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
 * @returns {number} Screen y coordinate in logical pixels.
 */
export function toScreenY(y) { return CANVAS_H - (y - state.camera.y) * UNIT_PX; }

/**
 * Converts a world x coordinate to a screen x coordinate.
 * @param {number} x - World x coordinate (in world units).
 * @returns {number} Screen x coordinate in logical pixels.
 */
export function toScreenX(x) { return x * UNIT_PX; }
