// The three museum floors. Each map is a 32x12 grid of tiles:
//   '#' wall — blocks movement and sight
//   '.' floor — open
//   'C' crate — blocks movement and sight, like a wall you can hide behind
//   'B' bush — walkable, hides the player (a potted plant, in museum terms)
//   'S' shadow — walkable dark patch, harder to be seen in
// People and objectives live in the level data, never in the map text, so a
// map holds only those five characters and stays easy to validate.

import { COLS, ROWS } from './config.js';

export const LEVELS = [
  {
    name: 'The Atrium',
    briefing:
      'The east wing sleeps. Lift 3 intel files, then slip out the south door. The guards walk a slow loop — watch the cones.',
    map: [
      '################################',
      '#......C.......B......S........#',
      '#......C.......B......S........#',
      '#......C.......B......S........#',
      '#......##########.....####.....#',
      '#..............................#',
      '#..C......S.......B......C.....#',
      '#..C......S.......B......C.....#',
      '#..C......S.......B......C.....#',
      '#......B...........S...........#',
      '#...........C..................#',
      '################################',
    ],
    playerStart: { x: 2, y: 2 },
    intel: [
      { x: 28, y: 2 },
      { x: 28, y: 7 },
      { x: 3, y: 10 },
    ],
    exit: { x: 28, y: 10 },
    guards: [
      { waypoints: [{ x: 8, y: 1 }, { x: 8, y: 5 }, { x: 20, y: 5 }, { x: 20, y: 1 }] },
      { waypoints: [{ x: 24, y: 6 }, { x: 10, y: 6 }, { x: 10, y: 10 }, { x: 24, y: 10 }] },
    ],
  },
  {
    name: 'The Gallery',
    briefing:
      'Portraits on every wall, guards on every floor. 4 intel files, tighter patrols, and a long hall with nowhere to hide — use the bushes.',
    map: [
      '################################',
      '#..B.....C.........S......C....#',
      '#..B.....C.........S......C....#',
      '#........C....####.......C.....#',
      '#..S.........####....B.........#',
      '#.......C.....####....B....C...#',
      '#.......C.................C....#',
      '#..C.........S......B..........#',
      '#..C.........S......B.....C....#',
      '#...........S..............C...#',
      '#....B........C.......S........#',
      '################################',
    ],
    playerStart: { x: 2, y: 2 },
    intel: [
      { x: 29, y: 1 },
      { x: 2, y: 10 },
      { x: 29, y: 8 },
      { x: 22, y: 3 },
    ],
    exit: { x: 29, y: 5 },
    guards: [
      { waypoints: [{ x: 5, y: 1 }, { x: 5, y: 6 }, { x: 14, y: 6 }, { x: 14, y: 1 }] },
      { waypoints: [{ x: 20, y: 4 }, { x: 20, y: 9 }, { x: 12, y: 9 }, { x: 12, y: 4 }] },
      { waypoints: [{ x: 24, y: 1 }, { x: 24, y: 6 }, { x: 28, y: 6 }, { x: 28, y: 1 }] },
    ],
  },
  {
    name: 'The Vault',
    briefing:
      'The vault itself. 5 intel files behind three patrols and a wall of crates. One mistake here and every guard in the room knows your name.',
    map: [
      '################################',
      '#....C......B.....S......C.....#',
      '#....C......B.....S......C.....#',
      '#....######.......S....####....#',
      '#..............................#',
      '#.B......C.....S......C....B...#',
      '#.B......C.....S......C....B...#',
      '#....S..........B..............#',
      '#....S....C............C.......#',
      '#.........C....S......C.....B..#',
      '#..C........B.......S..........#',
      '################################',
    ],
    playerStart: { x: 2, y: 2 },
    intel: [
      { x: 29, y: 1 },
      { x: 2, y: 9 },
      { x: 29, y: 6 },
      { x: 15, y: 10 },
      { x: 2, y: 4 },
    ],
    exit: { x: 29, y: 10 },
    guards: [
      { waypoints: [{ x: 6, y: 1 }, { x: 6, y: 4 }, { x: 12, y: 4 }, { x: 12, y: 1 }] },
      { waypoints: [{ x: 20, y: 5 }, { x: 20, y: 9 }, { x: 26, y: 9 }, { x: 26, y: 5 }] },
      { waypoints: [{ x: 10, y: 7 }, { x: 10, y: 10 }, { x: 18, y: 10 }, { x: 18, y: 7 }] },
    ],
  },
];

export function tileAt(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return level.map[ty][tx];
}

export function isWalkableTile(ch) {
  return ch === '.' || ch === 'B' || ch === 'S';
}

export function blocksSightTile(ch) {
  return ch === '#' || ch === 'C';
}

export function isWalkable(level, tx, ty) {
  return isWalkableTile(tileAt(level, tx, ty));
}

// Can a circle of `radius` centred at pixel (px, py) sit here without
// overlapping a solid tile? Grid origin is in pixels; see config.js.
export function circleFits(level, ox, oy, px, py, radius) {
  const minTx = Math.floor((px - radius - ox) / 32);
  const maxTx = Math.floor((px + radius - ox) / 32);
  const minTy = Math.floor((py - radius - oy) / 32);
  const maxTy = Math.floor((py + radius - oy) / 32);
  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (!isWalkable(level, tx, ty)) {
        const nearestX = Math.max(tx * 32 + ox, Math.min(px, tx * 32 + ox + 32));
        const nearestY = Math.max(ty * 32 + oy, Math.min(py, ty * 32 + oy + 32));
        const dx = px - nearestX;
        const dy = py - nearestY;
        if (dx * dx + dy * dy < radius * radius) return false;
      }
    }
  }
  return true;
}

// Line of sight between two pixel points: sample along the segment and
// fail if any sample lands in a sight-blocking tile.
export function hasLineOfSight(level, ox, oy, x1, y1, x2, y2) {
  const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 8);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    const tx = Math.floor((x - ox) / 32);
    const ty = Math.floor((y - oy) / 32);
    if (blocksSightTile(tileAt(level, tx, ty))) return false;
  }
  return true;
}

// Breadth-first search over walkable tiles from (sx, sy). Returns the set
// of reached "x,y" keys — used to prove every intel and the exit are
// reachable before a level is ever played.
export function bfsReachable(level, sx, sy) {
  const seen = new Set();
  const queue = [[sx, sy]];
  seen.add(`${sx},${sy}`);
  while (queue.length > 0) {
    const [x, y] = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (!seen.has(key) && isWalkable(level, nx, ny)) {
        seen.add(key);
        queue.push([nx, ny]);
      }
    }
  }
  return seen;
}

// Full structural check of one level. Returns an array of problems; an
// empty array means the level is sound.
export function validateLevel(level, index) {
  const problems = [];
  const tag = `level ${index + 1} (${level.name})`;
  if (level.map.length !== ROWS) problems.push(`${tag}: ${level.map.length} rows, want ${ROWS}`);
  level.map.forEach((row, y) => {
    if (row.length !== COLS) problems.push(`${tag} row ${y}: ${row.length} chars, want ${COLS}`);
    for (let x = 0; x < row.length; x++) {
      if (!['#', '.', 'C', 'B', 'S'].includes(row[x])) {
        problems.push(`${tag} row ${y} col ${x}: illegal tile '${row[x]}'`);
      }
    }
  });
  const checkPoint = (label, p) => {
    if (!isWalkable(level, p.x, p.y)) problems.push(`${tag}: ${label} at (${p.x},${p.y}) is not walkable`);
  };
  checkPoint('player start', level.playerStart);
  checkPoint('exit', level.exit);
  level.intel.forEach((p, i) => checkPoint(`intel ${i}`, p));
  level.guards.forEach((g, gi) => {
    g.waypoints.forEach((p, wi) => checkPoint(`guard ${gi} waypoint ${wi}`, p));
  });
  const reached = bfsReachable(level, level.playerStart.x, level.playerStart.y);
  const checkReachable = (label, p) => {
    if (!reached.has(`${p.x},${p.y}`)) problems.push(`${tag}: ${label} at (${p.x},${p.y}) is not reachable`);
  };
  checkReachable('exit', level.exit);
  level.intel.forEach((p, i) => checkReachable(`intel ${i}`, p));
  return problems;
}

export function validateAllLevels() {
  const problems = [];
  LEVELS.forEach((level, i) => problems.push(...validateLevel(level, i)));
  return problems;
}
