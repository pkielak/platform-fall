// Functional tests for the leaderboard / scoring logic.
import { test, describe, beforeEach, expect } from 'vitest';
import {
  calcScore, renderLeaderboard, submitName, resetSubmitFlag,
  showGameOverScreen, loadLeaderboard,
} from '../js/leaderboard.js';
import { elNameRow, elLeaderboard, elDComp, elDAlt } from '../js/dom.js';
import { setName } from './helpers/setup.js';

const LB_KEY = 'platformfall_leaderboard';

/**
 * Seeds localStorage with a pre-built leaderboard entry list.
 * @param {Array<{name: string, score: number}>} entries - Entries to store.
 */
function seedLb(entries) {
  localStorage.setItem(LB_KEY, JSON.stringify(entries));
}

describe('scoring', () => {
  test('calcScore = completions * 100 + altitude', () => {
    expect(calcScore(0, 0)).toBe(0);
    expect(calcScore(3, 120)).toBe(420);
    expect(calcScore(10, 5)).toBe(1005);
  });
});

describe('leaderboard persistence', () => {
  beforeEach(() => { localStorage.clear(); });

  test('loadLeaderboard returns [] when empty', () => {
    expect(loadLeaderboard()).toEqual([]);
  });

  test('loadLeaderboard sorts descending and trims to the max', () => {
    const entries = Array.from({ length: 15 }, (_, i) => ({ name: 'p' + i, score: i }));
    seedLb(entries);                        // seed via localStorage (leaderboard's own seam)
    const loaded = loadLeaderboard();
    expect(loaded).toHaveLength(10);
    expect(loaded[0].score).toBe(14);
    expect(loaded[loaded.length - 1].score).toBe(5);
  });

  test('loadLeaderboard repairs storage with too many entries', () => {
    seedLb(Array.from({ length: 12 }, (_, i) => ({ name: 'n' + i, score: i })));
    const loaded = loadLeaderboard();
    expect(loaded).toHaveLength(10);
    expect(JSON.parse(localStorage.getItem(LB_KEY))).toHaveLength(10);
  });
});

describe('game over screen', () => {
  beforeEach(() => { localStorage.clear(); resetSubmitFlag(); });

  test('reveals the name form when the score qualifies', () => {
    elNameRow.style.display = 'flex';
    showGameOverScreen(2, 50);
    expect(elNameRow.style.display).toBe('flex');
    expect(elDComp.textContent).toContain('Completions: 2');
    expect(elDAlt.textContent).toContain('Max altitude: 50m');
  });

  test('hides the name form when the score does not qualify', () => {
    seedLb(Array.from({ length: 10 }, (_, i) => ({ name: 'heavy', score: 10000 + i })));
    elNameRow.style.display = 'flex';
    showGameOverScreen(0, 1); // score 1, far below the board
    expect(elNameRow.style.display).toBe('none');
  });
});

describe('submission + rendering', () => {
  beforeEach(() => { localStorage.clear(); resetSubmitFlag(); });

  test('submitName records the score and re-renders the board', () => {
    showGameOverScreen(1, 100); // score 200
    setName('Ada');
    submitName();
    expect(JSON.parse(localStorage.getItem(LB_KEY))).toContainEqual({ name: 'Ada', score: 200 });
    expect(elLeaderboard.innerHTML).toContain('Ada');
  });

  test('names are HTML-escaped when rendered', () => {
    seedLb([{ name: '<script>x</script>', score: 5 }]);
    renderLeaderboard(null);
    expect(elLeaderboard.innerHTML).not.toContain('<script>');
    expect(elLeaderboard.innerHTML).toContain('&lt;script&gt;');
  });
});
