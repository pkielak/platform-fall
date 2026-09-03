// ─── Constants ──────────────────────────────────────────────

/** Map width in world units. */
export const MAP_W      = 24;
/** Pixels per world unit. */
export const UNIT_PX    = 50;
/** Canvas width in logical pixels (MAP_W * UNIT_PX = 1200). */
export const CANVAS_W   = MAP_W * UNIT_PX;   // 1200
/** Canvas height in logical pixels. */
export const CANVAS_H   = 1200;
/** Downward acceleration applied per tick. */
export const GRAVITY    = 0.05;
/** Horizontal velocity multiplier applied per tick (damping). */
export const FRICTION   = 0.7;
/** Horizontal velocity added per tick while holding a direction. */
export const SPEED      = 0.15;
/** Maximum absolute horizontal velocity. */
export const MAX_SPEED  = 0.5;
/** Initial vertical velocity for a jump. */
export const JUMP_V     = 0.85;
/** Player size in world units (occupies [y, y+PLAYER] vertically). */
export const PLAYER     = 1;
/**
 * Platform width tiers by altitude: `[minAltitude, widthMin, widthMax]`.
 * Higher altitudes yield narrower platforms.
 * @type {Array<[number, number, number]>}
 */
export const WIDTH_TIERS = [
  [0,    5, 6],
  [500,  4, 6],
  [1000, 4, 5],
  [1500, 3, 5],
  [2000, 3, 4],
  [2500, 2, 4],
  [3000, 2, 3],
  [3500, 1, 3],
  [4000, 1, 2],
];
/** Platform height in world units. */
export const PLAT_H     = 0.25;
/**
 * Vertical spacing (gap) tiers between successive platforms by altitude:
 * `[minAltitude, gapMin, gapMax]` in world units.
 * @type {Array<[number, number, number]>}
 */
export const REACH_TIERS = [
  [0,    2, 3],
  [1000, 2, 4],
  [2000, 3, 5],
  [3000, 4, 6],
];
/** Number of extra platforms buffered above the visible area. */
export const BUFFER     = 8;
/** Number of block slots (columns) in the power bar. */
export const BAR_SLOTS  = 24;
/** Number of rows in the power bar. */
export const BAR_ROWS   = 5;
/** Height of one bar row in logical pixels. */
export const BAR_ROW_H  = 20;
/** Cycle of colors used for blocks dropped into the bar. */
export const BLOCK_COLORS = ['#e94560','#ff6b6b','#533483','#0f3460','#16c79a','#f5a623'];

/** Maximum number of segments in the power bar. */
export const POWER_MAX      = 6;
/** Number of line completions needed to gain one power segment. */
export const POWER_PER_LINE = 4;

/** Vertical space reserved at the bottom of the canvas for the bar (px). */
export const BAR_RESERVED = BAR_ROW_H * BAR_ROWS + 16;
