# Platform Fall

A dice-driven, vertically-scrolling platformer that runs in the browser — no build step, no runtime dependencies.

Jump *up* across procedurally generated platforms. Each jump's height and reach are decided by dice rolls. Leaving a platform collects it: its blocks drop into a Tetris-style bar (24 × 5, aligned to the map columns) and completed rows clear to score. Banked rows also charge a double-jump power bar. When you fall off the bottom of the screen it's over — your score (`completions × 100 + max altitude`) can be submitted to a top-10 leaderboard stored in `localStorage`.

## Play

Open `index.html` in a modern browser, or serve the folder:

```bash
npm run serve          # zero-dependency static server
# or
python3 -m http.server 8000
```

The game is also a PWA: it ships with a manifest and service worker, so it can be installed and played offline.

## Controls

- **Move:** `←` `→` or `A` `D`
- **Jump:** `↑`, `W`, or `Space` (jump again mid-air to double-jump while power > 0)
- **Restart:** `R`

- **Gamepad:** stick / D-pad to move, A to jump, Start to restart (detected on connect)
- **Touch:** a two-row touch bar (START above D-pad + JUMP) appears automatically on touch-capable devices

## Development

```bash
npm install
npm test               # vitest test suite (dice, physics, generation, bar, leaderboard)
npm run test:watch
npm run test:coverage
```

Source is plain ES modules in `js/` (no bundler); see [SPEC.md](SPEC.md) for the full game specification, and `.github/workflows/` for CI and the GitHub Pages deployment.
