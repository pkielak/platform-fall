// ─── Main: game loop + boot ─────────────────────────────────
import { init, update, restart, state } from './game.js';
import { draw } from './render.js';
import { pollGamepad } from './input.js';
import { submitName } from './leaderboard.js';
import { elRestartBtn, elTouchRstBtn, elNameInput, elSubmitName, elBoot } from './dom.js';
import './pwa.js';

// ─── UI bindings ────────────────────────────────────────────
elRestartBtn.addEventListener('click', () => { restart(); });
elTouchRstBtn.addEventListener('touchstart', e => { e.preventDefault(); restart(); });
elSubmitName.addEventListener('click', submitName);
elSubmitName.addEventListener('touchstart', e => { e.preventDefault(); submitName(); });
elNameInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitName(); });

// ─── Game Loop (fixed timestep 60fps) ───────────────────────

/** Fixed simulation timestep in seconds (60 ticks per second). */
const FIXED_DT = 1 / 60;
/** Timestamp (ms) of the previous animation frame. */
let lastTime = 0;
/** Whether the first frame has been drawn (boot cover dismissal). */
let booted = false;
/** Accumulated time (s) not yet consumed by simulation ticks. */
let accumulator = 0;

/**
 * Main game loop (fixed timestep, 60fps simulation).
 * Accumulates frame time, runs update() in fixed steps, interpolates
 * player/camera one tick back for smooth rendering at any refresh rate,
 * then draws the frame.
 * @param {number} timestamp - Current frame timestamp in ms.
 * @returns {number|undefined} The next requestAnimationFrame handle, or undefined once the loop is running.
 */
function loop(timestamp) {
  if (!lastTime) { lastTime = timestamp || performance.now(); return requestAnimationFrame(loop); }
  let frameTime = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  // Clamp to avoid spiral of death
  if (frameTime > 0.1) frameTime = 0.1;
  accumulator += frameTime;
  pollGamepad();
  while (accumulator >= FIXED_DT) {
    update();
    accumulator -= FIXED_DT;
  }
  // Interpolate one tick back so rendering is smooth at any refresh rate
  const alpha = state.alive ? accumulator / FIXED_DT : 1;
  const trueCamY = state.camera.y, truePX = state.player.x, truePY = state.player.y;
  if (alpha < 1) {
    state.camera.y = state.camera.prevY + (trueCamY - state.camera.prevY) * alpha;
    state.player.x = state.player.prevX + (truePX - state.player.prevX) * alpha;
    state.player.y = state.player.prevY + (truePY - state.player.prevY) * alpha;
  }
  draw();
  if (!booted) {
    booted = true;
    elBoot.classList.add('done');
    setTimeout(() => elBoot.remove(), 500);
  }
  state.camera.y = trueCamY;
  state.player.x = truePX;
  state.player.y = truePY;
  requestAnimationFrame(loop);
}

init();
loop();
