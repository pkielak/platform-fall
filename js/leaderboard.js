// ─── Leaderboard (localStorage) ─────────────────────────────
import {
  elDComp, elDAlt, elDScore, elNameRow, elNameInput,
  elLeaderboard,
} from './dom.js';

/** localStorage key for the leaderboard entries. */
const LB_KEY  = 'platformfall_leaderboard';
/** Maximum number of leaderboard entries kept. */
const LB_MAX  = 10;

/**
 * Loads the leaderboard from localStorage, sorted by score descending.
 * Repairs corrupted storage (e.g. more than LB_MAX entries from an older
 * bug) by re-saving the trimmed list.
 * @returns {Array<{name: string, score: number}>} Leaderboard entries.
 */
export function loadLeaderboard() {
  try {
    let e = JSON.parse(localStorage.getItem(LB_KEY)) || [];
    e.sort((a, b) => b.score - a.score);
    e = e.slice(0, LB_MAX);
    // repair corrupted entries (e.g. > LB_MAX from older bug)
    if (e.length < JSON.parse(localStorage.getItem(LB_KEY) || '[]').length) {
      saveLeaderboard(e);
    }
    return e;
  }
  catch { return []; }
}

/**
 * Saves leaderboard entries to localStorage.
 * @param {Array<{name: string, score: number}>} entries - Entries to persist.
 */
function saveLeaderboard(entries) {
  try { localStorage.setItem(LB_KEY, JSON.stringify(entries)); } catch {}
}

/**
 * Calculates the final score from line completions and max altitude.
 * @param {number} completions - Number of completed bar lines.
 * @param {number} altitude - Maximum altitude reached (in meters).
 * @returns {number} The score (completions * 100 + altitude).
 */
export function calcScore(completions, altitude) {
  return completions * 100 + altitude;
}

/**
 * Adds a score to the leaderboard, keeping only the top LB_MAX entries.
 * @param {string} name - Player name.
 * @param {number} score - Score to record.
 */
function addScore(name, score) {
  const entries = loadLeaderboard();
  entries.push({ name, score });
  entries.sort((a, b) => b.score - a.score);
  saveLeaderboard(entries.slice(0, LB_MAX));
}

/**
 * Escapes a string for safe inclusion in HTML.
 * @param {string} s - Raw string to escape.
 * @returns {string} HTML-escaped string.
 */
function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

/**
 * Renders the leaderboard into the leaderboard container, optionally
 * highlighting the row matching the given name.
 * @param {string|null} [highlightName] - Name whose row should be highlighted.
 */
export function renderLeaderboard(highlightName) {
  const entries = loadLeaderboard();
  if (entries.length === 0) {
    elLeaderboard.innerHTML = '<h2>Leaderboard</h2><p class="lb-empty">No scores yet</p>';
    return;
  }
  let html = '<h2>Leaderboard</h2>';
  entries.forEach((e, i) => {
    const hl = e.name === highlightName ? ' highlight' : '';
    html += `<div class="lb-row${hl}">`;
    html += `<span class="lb-rank">${i + 1}.</span>`;
    html += `<span class="lb-name">${escHtml(e.name)}</span>`;
    html += `<span class="lb-score">${e.score}</span>`;
    html += '</div>';
  });
  elLeaderboard.innerHTML = html;
}

/** Score pending submission from the most recent game over. */
let pendingScore = 0;
/** Name pending submission from the most recent game over. */
let pendingName = '';

/**
 * Checks whether a score qualifies for the leaderboard (list not full, or
 * score beats the lowest entry).
 * @param {Array<{name: string, score: number}>} entries - Current leaderboard entries.
 * @param {number} score - Score to check.
 * @returns {boolean} True if the score makes the leaderboard.
 */
function qualifies(entries, score) {
  return entries.length < LB_MAX || score > entries[entries.length - 1].score;
}

/** Guard preventing the name form from being submitted twice per game. */
let submitted = false;

/** Resets the one-shot submission guard (called on restart). */
export function resetSubmitFlag() { submitted = false; }

/**
 * Shows the game over screen with the final stats and score, and reveals
 * the name entry form when the score qualifies for the leaderboard.
 * @param {number} completions - Number of completed bar lines.
 * @param {number} altitude - Maximum altitude reached (in meters).
 */
export function showGameOverScreen(completions, altitude) {
  const score = calcScore(completions, altitude);
  pendingScore = score;
  elDComp.textContent = 'Completions: ' + completions;
  elDAlt.textContent  = 'Max altitude: ' + altitude + 'm';
  elDScore.textContent = 'Score: ' + score;

  const entries = loadLeaderboard();
  if (qualifies(entries, score)) {
    elNameRow.style.display = 'flex';
    elNameInput.value = '';
    submitted = false;
    elLeaderboard.innerHTML = '';
  } else {
    elNameRow.style.display = 'none';
    submitted = true;
    renderLeaderboard(null);
  }
}

/**
 * Submits the player name, records the pending score, and re-renders the
 * leaderboard with the new entry highlighted. No-op if already submitted.
 */
export function submitName() {
  if (submitted) return;
  submitted = true;
  const name = elNameInput.value.trim() || 'anon';
  pendingName = name;
  addScore(name, pendingScore);
  elNameRow.style.display = 'none';
  renderLeaderboard(name);
}
