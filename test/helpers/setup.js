// ─── Test environment harness ───────────────────────────────
// Sets up a browser-like environment (jsdom + canvas stub) so the
// game modules — which read `document`, `window`, `localStorage`, and
// call `canvas.getContext` at import time — can be imported headlessly.
//
// IMPORTANT: this module MUST be imported before any js/*.js module so
// its side effects run first (ES modules evaluate imports in order).

import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(resolve(__dirname, '..', '..', 'index.html'), 'utf8');

const dom = new JSDOM(html, {
  url: 'http://localhost/',
  pretendToBeVisual: true,
});

const { window } = dom;

// jsdom has no canvas implementation; provide a no-op 2d context stub so
// canvas.getContext() returns a proxy of callable no-ops instead of null.
const ctxProxy = new Proxy({}, {
  get: (_t, prop) => {
    if (prop === 'canvas') return {};
    return () => ctxProxy;
  },
});
window.HTMLCanvasElement.prototype.getContext = function () { return ctxProxy; };
window.HTMLCanvasElement.prototype.addEventListener = function () {};

// Expose the browser globals the modules expect.
globalThis.window = window;
globalThis.document = window.document;
Object.defineProperty(globalThis, 'navigator', {
  value: window.navigator,
  configurable: true,
});
globalThis.localStorage = window.localStorage;
globalThis.performance = window.performance || globalThis.performance;
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.console = console;

// Expose the DOM helpers the tests need to simulate input & read HUD.
globalThis.documentClickedEl = null;

export const jsdom = dom;
export const windowGlobal = window;
export const documentGlobal = window.document;

/**
 * Fire a keyboard event by `code` (used to drive keyboard input).
 * @param {string} code - KeyboardEvent.code, e.g. 'Space' or 'ArrowLeft'.
 */
export function keyPress(code) {
  windowGlobal.dispatchEvent(new window.KeyboardEvent('keydown', { code }));
}

/**
 * Fire a keyboard keyup for `code`.
 * @param {string} code - KeyboardEvent.code, e.g. 'Space' or 'ArrowLeft'.
 */
export function keyRelease(code) {
  windowGlobal.dispatchEvent(new window.KeyboardEvent('keyup', { code }));
}

/**
 * Sets the value of the name input on the game-over form.
 * @param {string} v - The name to set.
 */
export function setName(v) {
  windowGlobal.document.getElementById('name-input').value = v;
}
