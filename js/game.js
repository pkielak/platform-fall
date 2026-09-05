// ─── Game State & Logic ─────────────────────────────────────
import {
  MAP_W, UNIT_PX, CANVAS_H, GRAVITY, FRICTION, SPEED, MAX_SPEED,
  JUMP_V, PLAYER, PLAT_H, BUFFER, BAR_SLOTS, BAR_ROWS,
  BAR_RESERVED, POWER_MAX, POWER_PER_LINE,
} from './constants.js';
import { roll, widthRange, reachRange, randColor } from './dice.js';
import { toScreenX, toScreenY } from './canvas.js';
import {
  elCompletions, elAltitude, powerCells, elDeath, elHints,
  elNameRow, elLeaderboard,
} from './dom.js';
import { showGameOverScreen, resetSubmitFlag } from './leaderboard.js';
import {
  inputLeft, inputRight, inputJump, inputRestart, keys,
} from './input.js';

// ─── Game State ─────────────────────────────────────────────

/**
 * Shared game state, mutated in place by the simulation and read by the
 * renderer.
 * @type {{
 *   player: {x: number, y: number, vx: number, vy: number, onGround: boolean,
 *            airJump: boolean, prevX: number, prevY: number} | null,
 *   platforms: Array<{x: number, y: number, w: number, h: number,
 *                     ground: boolean, collected?: boolean}>,
 *   camera: {y: number, prevY: number} | null,
 *   bar: {slots: Array<Array<string|null>>,
 *         anims: Array<{row: number, col: number, t: number, prevT: number, color: string}>,
 *         falling: Array<{x: number, y: number, prevY: number, w: number, color: string, t: number, prevT: number}>} | null,
 *   completions: number,
 *   maxAlt: number,
 *   alive: boolean,
 *   grounded: boolean,
 *   lastGroundY: number,
 *   power: number,
 *   linePending: number,
 * }}
 */
export const state = {
  player: null,
  platforms: [],
  camera: null,
  bar: null,
  completions: 0,
  maxAlt: 0,
  alive: true,
  grounded: false,
  lastGroundY: 0,
  power: 0,
  linePending: 0,
};

/** Last power level rendered to the DOM (avoids redundant updates). */
let powerRendered = -1;
/** Last completions value written to the HUD (avoids per-tick string builds). */
let hudComp = -1;
/** Last altitude value written to the HUD (avoids per-tick string builds). */
let hudAlt = -1;
/**
 * Reusable per-column block-count buffer shared by platform generation.
 * Zeroed at the start of each generation pass — keeps the 60Hz hot loop
 * allocation-free (a fresh array per tick caused periodic GC pauses).
 * @type {number[]}
 */
const colCount = new Array(BAR_SLOTS).fill(0);
/** Jump input state on the previous tick (edge detection). */
let jumpPressed = false;

/**
 * Initializes (or re-initializes) all game state: player, camera, bar,
 * power, and the initial platform chain above the ground.
 */
export function init() {
  // player.y = bottom of player; player occupies [y, y+1] in world coords
  state.player = { x: 11, y: 0, vx: 0, vy: 0, onGround: false, airJump: false, prevX: 11, prevY: 0 };
  state.camera = { y: 0, prevY: 0 };
  state.completions = 0;
  state.maxAlt = 0;
  state.alive = true;
  state.grounded = false;
  state.lastGroundY = 0;

  // Bar (2D grid: rows × cols, row 0 = bottom)
  state.bar = { slots: Array.from({length: BAR_ROWS}, () => new Array(BAR_SLOTS).fill(null)), anims: [], falling: [] };

  // Power bar (segments banked, 0..POWER_MAX) and pending lines toward the next segment.
  state.power = 0;
  state.linePending = 0;

  // Platforms: ground + chain
  state.platforms = [];
  state.platforms.push({ x: 0, y: 0, w: MAP_W, h: PLAT_H, ground: true });

  // Generate chain from ground (ground spans full width, center at MAP_W/2).
  // The bar is empty at birth, so colCount stays all-zeros; the shared
  // buffer is reused to keep the hot loop allocation-free.
  colCount.fill(0);
  let prevX = 0, prevW = MAP_W, prevY = 0;
  for (let i = 0; i < BUFFER + 5; i++) {
    const r = genNext(prevX, prevW, prevY, colCount);
    prevX = r.cx; prevW = r.w; prevY = r.cy;
  }
}

/**
 * Restarts the game: hides the game over screen, restores hints, clears
 * the name form and leaderboard DOM, and re-initializes state.
 */
export function restart() {
  elDeath.style.display = 'none';
  elHints.style.opacity = '0.6';
  elNameRow.style.display = 'none';
  resetSubmitFlag();
  elLeaderboard.innerHTML = '';
  init();
}

/**
 * Generates and appends the next platform in the chain.
 *
 * The width and vertical distance are rolled from altitude-based tiers.
 * The horizontal position is chosen to land on the emptiest bar columns
 * while staying within the reachable distance band of the previous
 * platform's center (so collected blocks fill the bar toward lines).
 * @param {number} cx - X of the previous platform.
 * @param {number} cw - Width of the previous platform.
 * @param {number} cy - Y of the previous platform.
 * @param {number[]} colCount - Reusable buffer with the current block count per bar column.
 * @returns {{cx: number, cy: number, w: number}} The new platform's center x, y, and width.
 */
function genNext(cx, cw, cy, colCount) {
  const [wMin, wMax] = widthRange(cy);
  const w = roll(wMin, wMax);
  const [rMin, rMax] = reachRange(cy);
  const dv = roll(rMin, rMax);
  const center = cx + cw / 2;
  const bar = state.bar;

  // colCount (blocks per column) is computed once per regen and reused,
  // avoiding a fresh Array + nested scan on every platform.

  // Place on the emptiest column reachable within [rMin, rMax] of the previous center
  const maxPos = MAP_W - w;

  // Pick uniformly at random among the tie-for-emptiest positions without
  // materialising them (reservoir sampling) — O(1) memory, no array alloc.
  let nx = undefined, bestScore = Infinity, n = 0;
  for (let x = 0; x <= maxPos; x++) {
    const dist = Math.abs((x + w / 2) - center);
    if (dist < rMin || dist > rMax) continue;
    // Inline block count for column range [x, x+w).
    let s = 0;
    for (let i = 0; i < w; i++) s += colCount[x + i];
    if (s < bestScore) { bestScore = s; nx = x; n = 1; }
    else if (s === bestScore) { n++; if (Math.random() * n < 1) nx = x; }
  }
  if (nx === undefined) {
    // Degenerate (no position in band) — stack directly above previous center
    nx = Math.max(0, Math.min(maxPos, Math.round(center - w / 2)));
  }

  const ny = cy + dv;
  state.platforms.push({ x: nx, y: ny, w, h: PLAT_H, ground: false });
  return { cx: nx, cy: ny, w };
}

/**
 * Returns the highest non-ground platform (the chain tip), or null if
 * there are none.
 *
 * O(1): the platforms array is always kept in strictly ascending y order
 * (ground first, genNext pushes strictly higher platforms, culling removes
 * the lowest, collectLastGround splices the middle), so the tip is the
 * last element — no scan needed.
 * @returns {?{x: number, y: number, w: number, h: number, ground: boolean}} The tip platform.
 */
function getChainTip() {
  const n = state.platforms.length;
  return n > 1 ? state.platforms[n - 1] : null;
}

/**
 * Culls platforms well below the camera and extends the chain upward
 * until it covers the visible area plus a buffer.
 */
function regenPlatforms() {
  const bar = state.bar;

  // Count blocks per column once and reuse the shared buffer for every
  // platform generated this pass (zeroed here, no per-tick allocation).
  colCount.fill(0);
  for (let col = 0; col < BAR_SLOTS; col++) {
    for (let row = 0; row < BAR_ROWS; row++) {
      if (bar.slots[row][col]) colCount[col]++;
    }
  }

  // Cull platforms below the camera in place (no new array each tick).
  const threshold = state.camera.y - 15;
  const plats = state.platforms;
  let w = 0;
  for (let i = 0; i < plats.length; i++) {
    if (plats[i].y + plats[i].h > threshold) plats[w++] = plats[i];
  }
  plats.length = w;

  let tip = getChainTip();
  if (!tip) return; // no platforms to extend from
  const maxY = state.camera.y + CANVAS_H / UNIT_PX + BUFFER + 5;
  while (tip.y < maxY) {
    const r = genNext(tip.x, tip.w, tip.y, colCount);
    tip = getChainTip();
    if (!tip) break; // safety: stop if chain is broken
  }
}

// ─── Bar helpers ────────────────────────────────────────────

/**
 * Drops a horizontal run of blocks into the bar, starting at column px
 * with width pw. Blocks stack upward from the bottom row, then any
 * completed rows are cleared.
 * @param {number} px - Starting column (world x of the collected platform).
 * @param {number} pw - Number of consecutive columns to fill.
 * @param {string} color - Block color (CSS color).
 */
function fillBar(px, pw, color) {
  const bar = state.bar;
  // Drop blocks from top, stack on existing blocks or bottom row
  for (let i = 0; i < pw; i++) {
    const col = px + i;
    if (col >= 0 && col < BAR_SLOTS) {
      // Find highest empty slot in this column (stack upward from row 0)
      for (let row = 0; row < BAR_ROWS; row++) {
        if (!bar.slots[row][col]) {
          bar.slots[row][col] = color;
          bar.anims.push({ row, col, t: 1.0, prevT: 1.0, color });
          break;
        }
      }
    }
  }
  clearCompleteRows();
}

/**
 * Clears all full bar rows, credits line completions (banking power
 * segments), and repacks remaining rows to the bottom.
 */
function clearCompleteRows() {
  const bar = state.bar;
  // Check each row from bottom to top
  let cleared = 0;
  for (let row = 0; row < BAR_ROWS; row++) {
    if (bar.slots[row].every(s => s !== null)) {
      // Row is full — clear it
      bar.slots[row] = new Array(BAR_SLOTS).fill(null);
      cleared++;
    }
  }
  if (cleared > 0) {
    state.completions += cleared;
    // Bank line completions into the power bar (POWER_PER_LINE lines -> 1 segment)
    for (let i = 0; i < cleared; i++) {
      state.linePending++;
      while (state.linePending >= POWER_PER_LINE && state.power < POWER_MAX) {
        state.linePending -= POWER_PER_LINE;
        state.power++;
      }
    }
    // Repack: collect all non-empty rows, stack them from the bottom
    const kept = bar.slots.filter(r => !r.every(s => s === null));
    bar.slots = Array.from({length: BAR_ROWS}, () => new Array(BAR_SLOTS).fill(null));
    for (let i = 0; i < kept.length; i++) {
      bar.slots[i] = kept[i];
    }
    bar.anims = [];
  }
}

// ─── Physics & Update ──────────────────────────────────────

/**
 * Advances the simulation by one fixed tick: input, horizontal movement,
 * jumping, gravity, platform collision, death check, camera follow,
 * platform regeneration, bar animations, and HUD updates.
 */
export function update() {
  if (inputRestart()) { keys['KeyR'] = false; restart(); }
  if (!state.alive) return;

  const player = state.player;
  const camera = state.camera;
  const bar = state.bar;

  // Save pre-tick state for render interpolation
  player.prevX = player.x;
  player.prevY = player.y;
  camera.prevY = camera.y;

  // Horizontal
  if (inputLeft())  player.vx -= SPEED;
  if (inputRight()) player.vx += SPEED;
  player.vx *= FRICTION;
  player.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, player.vx));
  player.x += player.vx;
  player.x = Math.max(0, Math.min(MAP_W - PLAYER, player.x));

  // Jump: ground jump is free; air jump (double jump) spends 1 power segment
  if (inputJump() && !jumpPressed) {
    if (player.onGround) {
      player.vy = JUMP_V;
      player.onGround = false;
      state.grounded = false;
      player.airJump = false;
    } else if (!player.airJump && state.power > 0) {
      state.power--; // consume one tile of power
      player.airJump = true;
      player.vy = JUMP_V;
    }
  }
  jumpPressed = inputJump();

  // Gravity
  const prevFoot = player.y; // foot position before this frame
  player.vy -= GRAVITY;
  player.y += player.vy;

  // Collision with platforms (only when falling)
  player.onGround = false;
  if (player.vy <= 0 || player.onGround) {
    for (const p of state.platforms) {
      // A falling player can only land on platform tops at or below the
      // pre-tick foot position — skip everything above (roughly half the
      // list) without testing.
      if (p.y > prevFoot) continue;
      const foot = player.y; // bottom of player
      // Sweep test: was the platform top inside the fall interval [foot, prevFoot]?
      const crossed = prevFoot >= p.y && foot <= p.y;
      // Resting test: are feet near the platform top?
      const resting = foot >= p.y - 0.1 && foot <= p.y + 0.1;
      if ((crossed || resting) &&
          player.x + PLAYER > p.x && player.x < p.x + p.w) {
        if (!state.grounded) collectLastGround();
        player.y = p.y;
        player.vy = 0;
        player.onGround = true;
        state.grounded = true;
        player.airJump = false; // air jump available again once grounded
        state.lastGroundY = p.y;
        break;
      }
    }
  }

  // Max altitude
  const alt = Math.max(0, Math.floor(player.y));
  if (alt > state.maxAlt) state.maxAlt = alt;

  // Death: player has fallen off the bottom of the screen (canvas bottom
  // is world y = camera.y)
  if (player.y < camera.y) {
    state.alive = false;
    showGameOverScreen(state.completions, state.maxAlt);
    elDeath.style.display = 'flex';
    elHints.style.opacity = '0';
  }

  // Camera — player at ~45% of visible game area (above bar).
  // The camera ratchets upward only: it never follows the player down,
  // so a fall off the bottom of the screen is final (see death check).
  const visibleUnits = (CANVAS_H - BAR_RESERVED) / UNIT_PX;
  const targetY = player.y - visibleUnits * 0.45;
  if (targetY > camera.y) camera.y += (targetY - camera.y) * 0.08;
  if (camera.y < 0) camera.y = 0;

  // Regen
  regenPlatforms();

  // Bar slot animations (prevT kept for render-side interpolation)
  for (let i = bar.anims.length - 1; i >= 0; i--) {
    const a = bar.anims[i];
    a.prevT = a.t;
    a.t -= 0.05;
    if (a.t <= 0) bar.anims.splice(i, 1);
  }
  // Falling block animations (prevY/prevT kept for render-side interpolation)
  const barY = CANVAS_H - BAR_RESERVED + 8;
  for (let i = bar.falling.length - 1; i >= 0; i--) {
    const f = bar.falling[i];
    f.prevY = f.y;
    f.prevT = f.t;
    f.y += 12; // fall speed in px
    f.t -= 0.04;
    if (f.y >= barY || f.t <= 0) bar.falling.splice(i, 1);
  }

  // HUD (build the string and touch the DOM only when the value changes,
  // so a steady state allocates nothing per tick)
  if (hudComp !== state.completions) {
    hudComp = state.completions;
    elCompletions.textContent = 'completions: ' + hudComp;
  }
  if (hudAlt !== state.maxAlt) {
    hudAlt = state.maxAlt;
    elAltitude.textContent = 'altitude: ' + hudAlt + 'm';
  }

  // Power bar cells (update only when the level changes)
  if (state.power !== powerRendered) {
    powerCells.forEach((c, i) => c.classList.toggle('on', i < state.power));
    powerRendered = state.power;
  }
}

/**
 * Collects the platform the player was standing on before this landing:
 * spawns a falling block animation, removes the platform, and drops its
 * blocks into the power bar.
 */
function collectLastGround() {
  const bar = state.bar;
  for (let i = 0; i < state.platforms.length; i++) {
    const p = state.platforms[i];
    if (Math.abs(p.y - state.lastGroundY) < 0.5 && !p.ground && !p.collected) {
      // Spawn falling block animation from platform to bar
      const sx = toScreenX(p.x);
      const sy = toScreenY(p.y, state.camera.y);
      const sw = p.w * UNIT_PX;
      const color = randColor();
      bar.falling.push({ x: sx, y: sy, prevY: sy, w: sw, color, t: 1.0, prevT: 1.0 });
      // Remove platform
      state.platforms.splice(i, 1);
      fillBar(p.x, p.w, color);
      break;
    }
  }
}
