// ─── Main: game loop + boot ─────────────────────────────────
import { init, update, restart } from './game.js';
import { draw } from './render.js';
import { reportFrameTime } from './canvas.js';
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
 * Accumulates frame time, runs update() in fixed steps, then draws the
 * frame at the fractional tick position (accumulator / FIXED_DT). All
 * interpolation happens inside draw() — the loop never mutates state.
 * @param {number} timestamp - Current frame timestamp in ms.
 * @returns {number|undefined} The next requestAnimationFrame handle, or undefined once the loop is running.
 */
function loop(timestamp) {
  if (!lastTime) { lastTime = timestamp || performance.now(); return requestAnimationFrame(loop); }
  const rawFrameMs = timestamp - lastTime;
  lastTime = timestamp;
  reportFrameTime(rawFrameMs);
  let frameTime = rawFrameMs / 1000;
  // Clamp to avoid spiral of death
  if (frameTime > 0.1) frameTime = 0.1;
  accumulator += frameTime;
  pollGamepad();
  while (accumulator >= FIXED_DT) {
    update();
    accumulator -= FIXED_DT;
  }
  draw(accumulator / FIXED_DT);
  if (!booted) {
    booted = true;
    elBoot.classList.add('done');
    setTimeout(() => elBoot.remove(), 500);
  }
  requestAnimationFrame(loop);
}

init();
loop();
