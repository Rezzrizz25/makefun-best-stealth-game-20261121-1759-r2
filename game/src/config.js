// NIGHTSHADE: The Silent Vault — shared tuning constants.
// One place for every number the rest of the game reads, so a balance
// tweak never means hunting through the movement or guard code.

export const TILE = 32;
export const COLS = 32;
export const ROWS = 12;
export const GRID_X = 128; // left margin: the 32-column board is 1024 wide
export const GRID_Y = 48; // top margin: room for the HUD bar
export const BOARD_W = COLS * TILE;
export const BOARD_H = ROWS * TILE;
export const CANVAS_W = 1280;
export const CANVAS_H = 480;

export const PLAYER_RADIUS = 11;
export const WALK_SPEED = 150; // pixels per second, upright
export const SNEAK_SPEED = 70; // pixels per second, crouched
export const GUARD_PATROL_SPEED = 62;
export const GUARD_CHASE_SPEED = 178;
export const GUARD_INVESTIGATE_SPEED = 95;
export const GUARD_CATCH_RADIUS = 24;

export const CONE_RANGE = 195; // how far a guard can see, in pixels
export const CONE_HALF_ANGLE = 0.9; // radians either side of facing (~103 deg total)
export const DETECT_FILL = 1.35; // detection per second at point-blank, full light
export const DETECT_DECAY = 0.45; // detection per second while unseen
export const SUSPICIOUS_AT = 0.35; // meter level that makes a guard investigate
export const ALERT_AT = 1.0; // meter level that triggers the chase
export const LOSE_SIGHT_AFTER = 3.0; // seconds unseen before a chase gives up

export const WALK_NOISE_RADIUS = 78; // footsteps heard this far while walking
export const SNEAK_NOISE_RADIUS = 26; // footsteps heard this far while sneaking
export const COIN_NOISE_RADIUS = 135;
export const COIN_RANGE = 230; // farthest a thrown coin can land
export const COINS_PER_LEVEL = 3;

export const BUSH_VISIBILITY = 0.22; // standing in a bush: this much of normal
export const SHADOW_VISIBILITY = 0.45; // standing in shadow: this much of normal
export const SNEAK_VISIBILITY = 0.55; // sneaking: this much of normal
export const MOVING_VISIBILITY = 1.15; // moving upright: slightly easier to spot

export const COLORS = {
  bg: '#0a0d16',
  floor: '#1b2138',
  floorAlt: '#171c30',
  wall: '#3a4368',
  wallTop: '#4d578a',
  crate: '#6b4f2a',
  crateEdge: '#8a6a3d',
  bush: '#1e4d2b',
  bushLeaf: '#2f7a44',
  shadow: '#10142a',
  shadowEdge: '#232a52',
  exitClosed: '#5a2e2e',
  exitOpen: '#2fae5f',
  intel: '#ffd94a',
  player: '#e8e4d8',
  playerSneak: '#9fb4d8',
  guard: '#e5484d',
  guardSuspicious: '#f5a524',
  guardAlert: '#ff2e3f',
  cone: 'rgba(245, 200, 80, 0.20)',
  coneSuspicious: 'rgba(245, 165, 36, 0.28)',
  coneAlert: 'rgba(255, 46, 63, 0.30)',
  coin: '#d8c26a',
  hud: '#dfe6ff',
  hudDim: '#8b93b8',
  danger: '#ff5a6e',
};
