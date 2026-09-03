// ─── Input (keyboard, touch, gamepad) ───────────────────────
import { elNameInput, elHints } from './dom.js';

/**
 * Keyboard state map, keyed by `KeyboardEvent.code`.
 * @type {Record<string, boolean>}
 */
export const keys = {};
window.addEventListener('keydown', e => {
  if (e.target === elNameInput) return;
  keys[e.code] = true;
  if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup',   e => { keys[e.code] = false; });

/** Touch button state (mobile on-screen controls). */
const touchState = { left: false, right: false, jump: false };

/**
 * Binds a touch button element to a property of touchState, handling
 * touchstart, touchend, and touchcancel.
 * @param {string} id - DOM id of the touch button element.
 * @param {'left'|'right'|'jump'} prop - touchState property to control.
 */
function bindTouch(id, prop) {
  const el = document.getElementById(id);
  el.addEventListener('touchstart', e => { e.preventDefault(); touchState[prop] = true; });
  el.addEventListener('touchend',   e => { e.preventDefault(); touchState[prop] = false; });
  el.addEventListener('touchcancel',e => { e.preventDefault(); touchState[prop] = false; });
}
bindTouch('dpad-left', 'left');
bindTouch('dpad-right', 'right');
bindTouch('btn-jump', 'jump');

// ─── Gamepad (Web Gamepad API) ─────────────────────────────

/** Gamepad input state, refreshed on every poll. */
const gp = { left: false, right: false, jump: false, restart: false };

/**
 * Polls all connected gamepads and updates the gamepad input state.
 * Axis threshold of 0.35 is used for the left stick; d-pad, A, and
 * Start buttons are mapped to left/right/jump/restart.
 */
export function pollGamepad() {
  gp.left = gp.right = gp.jump = gp.restart = false;
  if (!navigator.getGamepads) return;
  const pads = navigator.getGamepads();
  for (const p of pads) {
    if (!p) continue;
    const ax = p.axes[0] || 0;
    if (ax < -0.35) gp.left = true;
    if (ax >  0.35) gp.right = true;
    const b = p.buttons;
    if (b[14] && b[14].pressed) gp.left = true;      // d-pad left
    if (b[15] && b[15].pressed) gp.right = true;     // d-pad right
    if (b[12] && b[12].pressed) gp.jump = true;      // d-pad up
    if (b[0]  && b[0].pressed)  gp.jump = true;      // A
    if (b[9]  && b[9].pressed)  gp.restart = true;   // Start
  }
}
window.addEventListener('gamepadconnected', () => {
  if (window.innerWidth >= 1024) {
    elHints.textContent = 'Gamepad: Stick / D-Pad to move \u00B7 A to jump \u00B7 Start to restart';
  }
});

/**
 * Whether the left direction is currently held (keyboard, touch, or gamepad).
 * @returns {boolean} True if left movement is active.
 */
export function inputLeft()   { return keys['ArrowLeft']  || keys['KeyA'] || touchState.left  || gp.left; }

/**
 * Whether the right direction is currently held (keyboard, touch, or gamepad).
 * @returns {boolean} True if right movement is active.
 */
export function inputRight()  { return keys['ArrowRight'] || keys['KeyD'] || touchState.right || gp.right; }

/**
 * Whether jump is currently held (keyboard, touch, or gamepad).
 * @returns {boolean} True if jump input is active.
 */
export function inputJump()   { return keys['Space']      || keys['ArrowUp'] || keys['KeyW'] || touchState.jump || gp.jump; }

/**
 * Whether restart is currently held (keyboard R or gamepad Start).
 * @returns {boolean} True if restart input is active.
 */
export function inputRestart(){ return keys['KeyR'] || gp.restart; }
