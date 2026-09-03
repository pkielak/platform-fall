// ─── DOM refs ───────────────────────────────────────────────

/** Main game screen canvas. */
export const gameCanvas    = document.getElementById('game');
/** HUD element showing the number of line completions. */
export const elCompletions = document.getElementById('completions');
/** HUD element showing the max altitude. */
export const elAltitude    = document.getElementById('altitude');
/** HUD element showing the power bar label. */
export const elPowerLabel  = document.getElementById('power-label');
/** Power bar segment cells. */
export const powerCells    = document.querySelectorAll('.p-cell');
/** Boot cover shown until the first frame is drawn. */
export const elBoot        = document.getElementById('boot');
/** Game over overlay. */
export const elDeath       = document.getElementById('death');
/** Game over overlay: completions value. */
export const elDComp       = document.getElementById('d-completions');
/** Game over overlay: max altitude value. */
export const elDAlt        = document.getElementById('d-altitude');
/** Desktop restart button. */
export const elRestartBtn  = document.getElementById('restart-btn');
/** Mobile restart button. */
export const elTouchRstBtn = document.getElementById('btn-restart');
/** On-screen hints element. */
export const elHints       = document.getElementById('hints');
/** Game over overlay: final score value. */
export const elDScore      = document.getElementById('d-score');
/** Game over overlay: name input row. */
export const elNameRow     = document.getElementById('name-input-row');
/** Game over overlay: name input field. */
export const elNameInput   = document.getElementById('name-input');
/** Game over overlay: submit name button. */
export const elSubmitName  = document.getElementById('submit-name-btn');
/** Leaderboard container. */
export const elLeaderboard = document.getElementById('leaderboard');
/** PWA install prompt button. */
export const elInstall     = document.getElementById('install-btn');
