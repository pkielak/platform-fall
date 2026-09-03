// ─── PWA: install prompt + service worker ────────────────────────
import { elInstall } from './dom.js';

/**
 * Deferred `beforeinstallprompt` event, held so the install prompt can be
 * triggered from the install button. Null if not yet received (or already
 * consumed).
 * @type {Event|null}
 */
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstall = e;
  elInstall.style.display = 'block';
});
elInstall.addEventListener('click', async () => {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  const { outcome } = await deferredInstall.userChoice;
  if (outcome === 'accepted') elInstall.style.display = 'none';
  deferredInstall = null;
});
window.addEventListener('appinstalled', () => { elInstall.style.display = 'none'; });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .catch((err) => console.warn('Service worker registration failed:', err));
  });
}
