// ─── PWA: install prompt + service worker ────────────────────────
import { elInstall } from './dom.js';

/**
 * Deferred `beforeinstallprompt` event, held so the install prompt can be
 * triggered from the install button. Null if not yet received (or already
 * consumed).
 *
 * Only Chromium browsers (Chrome/Edge) fire this event — and only on secure
 * (https) origins where the app is actually installable. Firefox for Android
 * has no such API, so on those browsers the button stays hidden and
 * installation happens through the browser menu instead.
 * @type {Event|null}
 */
let deferredInstall = null;

/**
 * True when running as an installed app (no browser chrome), in which case
 * the install button must never be shown.
 * @returns {boolean}
 */
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true; // legacy iOS
}

// The button is hidden by default (see style.css); reveal it only when the
// browser offers a real install prompt.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstall = e;
  if (!isStandalone()) elInstall.style.display = 'block';
});

elInstall.addEventListener('click', async () => {
  if (!deferredInstall) return;
  const pending = deferredInstall;
  deferredInstall = null;
  pending.prompt();
  const { outcome } = await pending.userChoice;
  if (outcome === 'accepted') elInstall.style.display = 'none';
});

window.addEventListener('appinstalled', () => { elInstall.style.display = 'none'; });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .catch((err) => console.warn('Service worker registration failed:', err));
  });
}
