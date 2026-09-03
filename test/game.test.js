// Functional (black-box + seam) tests for the game simulation.
import { test, describe, beforeEach, expect } from 'vitest';
import { init, update, restart, state } from '../js/game.js';
import { elCompletions, elAltitude, elDeath, elDComp, elDAlt } from '../js/dom.js';
import { keyPress, keyRelease } from './helpers/setup.js';

/**
 * Simulate one jump press edge: keydown, one frame, keyup.
 * Jump edge-detection latches `jumpPressed` during the frame, so a *second*
 * distinct press (e.g. a double jump) needs one extra frame with the key
 * released first, letting `jumpPressed` return to false.
 */
function tapJump() {
  keyPress('Space');
  update();
  keyRelease('Space');
}

/** Observe the currently-held / released key state on one frame. */
function frame() { update(); }

/**
 * Counts the total number of blocks currently in the bar.
 * @returns {number} The number of filled bar slots.
 */
function countBarBlocks() {
  let n = 0;
  for (const row of state.bar.slots) for (const c of row) if (c) n++;
  return n;
}

describe('game simulation', () => {
  beforeEach(() => { init(); });

  test('init() establishes a valid starting state', () => {
    expect(state.player).toBeTruthy();
    expect(state.player.x).toBe(11);
    expect(state.player.y).toBe(0);        // rests on the ground platform top
    expect(state.player.onGround).toBe(false); // grounded after the first frame's collision
    expect(state.alive).toBe(true);
    expect(state.completions).toBe(0);
    expect(state.power).toBe(0);
    expect(state.platforms[0].ground).toBe(true);
    expect(state.platforms[0].w).toBe(24);
    expect(state.platforms.length).toBeGreaterThan(8);
  });

  test('a ground jump lifts the player and returns them to the ground', () => {
    frame();                                // first frame: collision grounds the player
    expect(state.player.onGround).toBe(true);

    tapJump();
    expect(state.player.onGround).toBe(false);
    expect(state.player.vy).toBeGreaterThan(0);

    let guard = 0;
    while (!state.player.onGround && guard++ < 1000) update();
    expect(state.player.onGround).toBe(true);
    expect(state.maxAlt).toBeGreaterThanOrEqual(6);
  });

  test('horizontal input stays within the map bounds', () => {
    keyPress('ArrowRight');
    for (let i = 0; i < 400 && state.alive; i++) update();
    expect(state.player.x).toBeLessThanOrEqual(23);
    expect(state.player.x).toBeGreaterThanOrEqual(0);

    init();
    keyPress('ArrowLeft');
    for (let i = 0; i < 400 && state.alive; i++) update();
    expect(state.player.x).toBeGreaterThanOrEqual(0);
  });

  test('air jump consumes one power segment only when power > 0', () => {
    frame();                                // settle onto the ground
    tapJump();                              // ground jump
    expect(state.player.onGround).toBe(false);

    frame();                                // release observed -> edge resets
    state.power = 2;
    tapJump();                              // rising edge -> air jump
    expect(state.player.airJump).toBe(true);
    expect(state.power).toBe(1);

    init();
    frame();                                // settle
    tapJump();                              // ground jump
    frame();                                // release observed
    state.power = 0;
    tapJump();                              // rising edge, but no power
    expect(state.player.airJump).toBe(false);
    expect(state.power).toBe(0);
  });

  test('air jump flag resets once the player lands', () => {
    frame();                                // settle onto the ground
    tapJump();                              // ground jump
    frame();                                // release observed
    state.power = 1;
    tapJump();                              // air jump -> airJump true
    expect(state.player.airJump).toBe(true);
    let guard = 0;
    while (!state.player.onGround && guard++ < 1000) update();
    expect(state.player.airJump).toBe(false);
  });

  test('falling off the bottom of the screen kills the player and shows the death screen', () => {
    elDeath.style.display = 'none';
    state.player.y = -11;                   // well below the camera (camera.y = 0)
    state.player.vy = -1;
    update();
    expect(state.alive).toBe(false);
    expect(elDeath.style.display).toBe('flex');
    expect(elDComp.textContent).toContain('Completions:');
    expect(elDAlt.textContent).toContain('altitude:');
  });

  test('HUD reflects altitude updates', () => {
    expect(elCompletions.textContent).toBe('completions: 0');
    expect(elAltitude.textContent).toBe('altitude: 0m');
    state.maxAlt = 42;
    update();
    expect(elAltitude.textContent).toBe('altitude: 42m');
  });

  test('collecting platforms fills the collection bar (functional)', () => {
    expect(countBarBlocks()).toBe(0);

    // Seam: drop the player straight onto the first non-ground platform so
    // lastGroundY points at it. (Driving this via gameplay alone would be
    // flaky: platforms are placed at random x, and without horizontal input
    // the player only collects when one happens to overlap their column.)
    const p = state.platforms.find(pl => !pl.ground);
    state.player.x = p.x + p.w / 2 - 0.5;
    // Chain platforms ascend with a minimum gap of 2, so starting below
    // p.y + 2 guarantees the player lands on p, not a platform above it.
    state.player.y = p.y + 1.5;
    state.player.vy = 0;
    let guard = 0;
    while (!state.player.onGround && guard++ < 200) update();
    expect(state.player.onGround).toBe(true);
    expect(state.lastGroundY).toBe(p.y);

    // Jump off and land again: re-landing collects the platform the player
    // was standing on, dropping its blocks into the bar.
    tapJump();
    guard = 0;
    while (!state.player.onGround && guard++ < 200) update();
    expect(state.player.onGround).toBe(true);
    expect(countBarBlocks()).toBeGreaterThan(0);
  });

  test('restart() hides the death screen and resets the game', () => {
    frame();                                // settle onto the ground
    tapJump();                              // ground jump
    state.player.y = -11;                   // well below the camera (camera.y = 0)
    update();
    expect(state.alive).toBe(false);

    restart();
    expect(elDeath.style.display).toBe('none');
    expect(state.alive).toBe(true);
    expect(state.completions).toBe(0);
    expect(state.player).toBeTruthy();
  });
});
