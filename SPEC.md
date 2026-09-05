# Platform Fall — Game Specification

## Overview

**Platform Fall** is a vertically-scrolling platformer where the player jumps upward on procedurally generated platforms. The vertical and horizontal placement of every next platform is decided by **dice rolls**: how many units up, and how many units left or right. Each platform left behind is "collected" and its blocks drop into a Tetris-style bar at the bottom of the screen; completed rows clear and score. The final score is `completions × 100 + max altitude`, and the top 10 scores are kept in a local leaderboard.

## World — Units

The world is measured in **units**. Rendering scale: `1 unit = 50 px`; canvas is 1200×1200 px (24×24 units, square) and scales to fit the window.

- **Map width:** 24 units, hard walls at x = 0 and x = 24
- **Grid:** the map is 24 unit columns; every platform snaps to it (integer unit positions)
- **Map height:** infinite upward
- **Ground:** full-width (24 units) solid floor at the bottom, present from the start; never collected
- **Player:** 1×1 unit square

## Core Mechanics

### Player
- **Shape:** 1×1 unit square with eyes that track movement direction
- **Controls:**
  - Keyboard: arrows or WASD to move; Up/W/Space to jump; R to restart
  - Gamepad (Web Gamepad API): stick/D-pad to move, A to jump, Start to restart — detected on connect
  - Touch: two-row touch bar (shown on touch devices) — START button above a row with left/right D-pad on the left and a JUMP button on the right
- **Physics (per fixed tick at 60 Hz, in units):**
  - Gravity: `0.05` u/tick²
  - Horizontal acceleration: `0.15` u/tick while holding a direction
  - Friction: `0.7` (velocity damping applied every tick)
  - Max horizontal speed: `0.5` u/tick (velocity clamp)
  - Jump velocity: `0.85` u/tick upward
  - Single jump per ground contact, plus one **air jump** when power is available (see Power Bar)

### Jump Reach (game constraint)
- **Up:** at most **6 units**
- **Sideways:** at most **6 units** left or right (combined)
- The worst case — 6 up **and** 6 sideways in a single jump — must always be physically reachable (see Design Rule)

### Platforms — Dice-Based Placement
There are no placement heuristics beyond the reach band and bar-aware column choice. Placement is:

1. The generator keeps a **chain**: each platform's successor is rolled from it at creation. A buffer of at least **8 platforms** is always kept above the player so the next landing spot is visible before the jump; platforms far below the camera are discarded in place.
2. **Grid placement:** a platform's position is its **left edge** `x` (integer, in units). A `w`-unit platform occupies exactly `w` consecutive unit slots `[x, x + w)` — always snapped to the grid.
3. For each new platform:
   - **Width:** uniform random in `[wMin, wMax]`, where the range depends on the platform's altitude (see `WIDTH_TIERS` below)
   - **Vertical die** `Dv` — the new platform sits `Dv` units **above** the previous one (top surfaces at integer unit heights), rolled uniformly in the reach range for the platform's altitude (see `REACH_TIERS` below)
   - **Horizontal placement** — the platform is placed on the **emptiest** reachable column: among all grid positions whose center lies `rMin`–`rMax` units horizontally from the previous platform's center (the same `REACH_TIERS` range), the one with the fewest bar blocks under its span wins; ties break uniformly at random (reservoir sampling, O(1) memory). If no position falls in the band (degenerate case), it stacks directly above the previous center.
4. **Map bounds:** the search only considers positions within `[0, 24 − w]`, so the result is always grid-aligned and on the map.
5. **Guaranteed reachability:** vertical offset ≤ 6 (≤ max jump height) and horizontal offset ≤ 6 (≤ max sideways reach). The worst-case edge-to-edge gap is `rMax − w_near ≤ 6 − 1 = 5` units (`w_near` = width of the platform on the near side, minimum 1), comfortably inside the reach.
6. The first platform is rolled from the ground: height `Dv` above it, position chosen by the same emptiest-column rule (with an empty bar, that is uniformly random among reachable slots).
7. Overlaps between non-adjacent platforms are allowed and harmless (the player only ever jumps upward).

### Collection & Bar System
- **Collection:** a platform is collected when the player leaves it and lands on a different platform (confirmed landing). The collected platform is **removed from the world**.
- **Bar layout:** a **24 × 5 grid** (24 slots wide, 5 rows high), 1 slot = 1 unit column, aligned 1:1 with the map's unit columns; row height 20 px. The bar occupies a reserved strip at the bottom of the canvas (`BAR_ROWS × BAR_ROW_H + 16` px).
- **Filling:** a collected platform of width `w` drops one block **per column** of its span `[x, x + w)` into the bar at the same world columns, with an animated falling block effect from the platform down to the bar. In each column, blocks stack upward from the bottom row into the first empty slot.
- **Completion:** when all 24 slots of a row are filled, the row clears; remaining rows are repacked to the bottom.
- **Scoring:** each cleared row increments the `completions` counter.
- **Block colors:** randomly chosen from `#e94560`, `#ff6b6b`, `#533483`, `#0f3460`, `#16c79a`, `#f5a623`

### Power Bar

A separate **6-segment power bar** displayed in the HUD (label `dbljmp pwr`, cells fill left-to-right), matching the `#completions` font size.

- **Charging:** each **line completion** (a bar row clearing) contributes to the power bar. Every **4 line completions** add **1 segment**, capped at **6 segments**.
- **Level:** tracked by a dedicated `power` counter (plus a `linePending` remainder), **decoupled from `completions`** so spending power on an air jump does not lower the completions score. `0 ≤ power ≤ 6`.
- **Rendering:** the bar is a DOM element inside `#hud` with a `dbljmp pwr` label and 6 cells. Filled cells are teal `#16c79a`; the final (6th) segment — the one that completes the bar — is amber `#f5a623` as a "full" indicator. Cells toggle an `.on` class only when the level changes.
- **Air jump (double jump):** the ground jump is free. While airborne, one **air jump** is allowed per fall, but only when `power > 0`; it **consumes 1 segment** (`power--`). With `power === 0` there is no air jump. `airJump` resets when the player lands.
- **Extension point:** when the bar reaches 6 segments, a power-up can be triggered here (current behavior only displays the charge).

### Death Condition & Game Over
- The camera **ratchets upward only** — it never follows the player down (clamped at `y ≥ 0`, i.e. the ground).
- The player dies as soon as they fall **below the bottom of the visible area** (player `y < camera.y`), because the camera no longer follows them downward.
- The game-over screen displays:
  - Completions
  - Maximum altitude reached (1 unit = 1 m)
  - **Score:** `completions × 100 + max altitude`
  - A name input (max 10 chars) to submit the score to the leaderboard
  - The current leaderboard with the new entry highlighted

### Leaderboard
- **Storage:** `localStorage` under key `platformfall_leaderboard`; top **10** entries, sorted by score descending
- **Qualification:** the list is not full, or the score beats the lowest entry
- **Repair:** corrupted storage (e.g. more than 10 entries) is trimmed and re-saved on load

## Camera
- Smooth follow with `0.08` lerp factor, **upward only** (ratchets: never decreases except clamping at 0)
- Player positioned at ~45% of the visible game area (canvas minus the reserved bar strip)
- Clamped to the 24-unit map horizontally

## Visual Theme
- **Shell:** skeuomorphic handheld console — full-width plastic shell with a centered square bezel/LCD and a bezel label
- **Background:** Dark blue/purple (`#16213e` / `#1a1a2e`) with subtle grid overlay
- **Sky gradient:** Shifts with altitude
- **Platforms:** Gradient from `#0f3460` to `#533483` with `#e94560` top edge highlight; pre-rendered per-width sprites (one per width 1..6, blitted 1:1)
- **Player:** Gradient from `#e94560` to `#ff6b6b`
- **Walls:** `#e94560` solid lines, 3px wide
- **Rendering:** CSS owns the canvas layout size; JS only matches the backing store (DPR capped at 1.5). Adaptive resolution: sustained sub-60 fps (external load — other tabs, thermal throttling) drops the backing-store scale to 1.0, and it is restored after sustained headroom. Cached gradients/sprites, pure `draw(alpha)` renderer that interpolates all motion (camera, player, falling blocks, block fades) between simulation ticks for high-refresh displays

## HUD
- **Top-left:** `dbljmp pwr` power bar
- **Top-left (below power):** `completions: N` (bold)
- **Top-right:** `altitude: Nm`
- **Top-center (HTML overlay):** Control hints (updated for gamepad when one connects)
- **Install button:** shown when the PWA is installable

## PWA
- `manifest.webmanifest` + pre-rendered icons make the game installable
- A service worker (`sw.js`) caches the app shell (versioned cache name, e.g. `platform-fall-v15`) and serves it offline; the cache version is bumped whenever the module graph changes

## Design Rule — Reachability

The dice guarantee that every next platform lies within 6 units up and 6 units sideways of the current one. Physics must make **every** such point reachable in a single jump:

> Max jump height ≥ 6 units **and** max sideways travel ≥ 6 units, including the combined worst case (6 up + 6 sideways simultaneously).

With the current constants (60 Hz):
- **Max jump height** = `JUMP_V² / (2 × GRAVITY)` = `0.85² / 0.1` ≈ **7.2 units** (margin: 1.2)
- **Air time** (same-height) = `2 × JUMP_V / GRAVITY` = **34 ticks**
- **Horizontal:** with acceleration `0.15`, damping `0.7`, and a `0.5` clamp, velocity reaches ~0.49 within ~10 ticks; max sideways travel over 34 ticks ≈ **16 units** (margin: ~10)
- **Worst corner check:** reaching (6 right, 6 up) — horizontal travel passes 6 units at `t ≈ 14` ticks, where height = `0.85×14 − 0.5×0.05×14²` = `11.9 − 4.9` = **7 ≥ 6** ✓

Any change to gravity, jump force, acceleration, friction, or speed must preserve this. If a parameter is tuned, re-verify the worst corner.

## Constants Reference

| Constant | Value | Description |
|---|---|---|
| `MAP_W` | 24 | Map width (units) |
| `UNIT_PX` | 50 | Pixels per unit (rendering scale) |
| `CANVAS_W` | 1200 | Canvas width (logical px) |
| `CANVAS_H` | 1200 | Canvas height (logical px) |
| `GRAVITY` | 0.05 | Vertical acceleration (u/tick²) |
| `FRICTION` | 0.7 | Horizontal velocity damping per tick |
| `SPEED` | 0.15 | Horizontal acceleration while holding a direction (u/tick) |
| `MAX_SPEED` | 0.5 | Horizontal speed clamp (u/tick) |
| `JUMP_V` | 0.85 | Jump initial velocity (u/tick) |
| `PLAYER` | 1 | Player size (units) |
| `WIDTH_TIERS` | see below | Altitude → platform width range (units) |
| `PLAT_H` | 0.25 | Platform thickness (units) |
| `REACH_TIERS` | see below | Altitude → dice reach range (units) |
| `BUFFER` | 8 | Platforms pre-generated above the visible area |
| `BAR_SLOTS` | 24 | Bar columns (1 slot = 1 map column) |
| `BAR_ROWS` | 5 | Bar rows |
| `BAR_ROW_H` | 20 | Bar row height (px) |
| `BAR_RESERVED` | 116 | Canvas strip reserved for the bar (px) |
| `POWER_MAX` | 6 | Power bar segments (max) |
| `POWER_PER_LINE` | 4 | Line completions needed per power segment |

### WIDTH_TIERS

Platform width range (units) by altitude of the platform being generated — difficulty ramps up (platforms get narrower) with height:

| Altitude (m) | Width range |
|---|---|
| 0 – 499 | 5 – 6 |
| 500 – 999 | 4 – 6 |
| 1000 – 1499 | 4 – 5 |
| 1500 – 1999 | 3 – 5 |
| 2000 – 2499 | 3 – 4 |
| 2500 – 2999 | 2 – 4 |
| 3000 – 3499 | 2 – 3 |
| 3500 – 3999 | 1 – 3 |
| 4000+ | 1 – 2 |

### REACH_TIERS

Dice reach range (units) for `Dv`/`Dh` by altitude of the platform being generated — both dice roll in this range, stepping up together (staircase):

| Altitude (m) | Reach range |
|---|---|
| 0 – 999 | 2 – 3 |
| 1000 – 1999 | 2 – 4 |
| 2000 – 2999 | 3 – 5 |
| 3000+ | 4 – 6 |

## Testing

Behavior is covered by a Vitest suite (`npm test`) in `test/`: dice rolls/tiers, physics & reachability, platform generation & collection, bar filling/clearing, sprite-table contract, and leaderboard logic (jsdom).
