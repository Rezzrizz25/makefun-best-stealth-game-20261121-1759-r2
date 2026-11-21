// Wren, the thief. Pixel movement with axis-separated collision so she
// slides along walls instead of sticking to them, a sneak toggle that trades
// speed for quiet and hard-to-see, and a coin pouch for distractions.

import {
  TILE,
  GRID_X,
  GRID_Y,
  BOARD_W,
  BOARD_H,
  PLAYER_RADIUS,
  WALK_SPEED,
  SNEAK_SPEED,
  COINS_PER_LEVEL,
  COIN_RANGE,
  COIN_NOISE_RADIUS,
  WALK_NOISE_RADIUS,
  SNEAK_NOISE_RADIUS,
} from './config.js';
import { circleFits, tileAt } from './world.js';
import { clamp, dist } from './random.js';

export class Player {
  constructor(level) {
    this.reset(level);
  }

  reset(level) {
    this.tileX = level.playerStart.x;
    this.tileY = level.playerStart.y;
    this.x = GRID_X + this.tileX * TILE + TILE / 2;
    this.y = GRID_Y + this.tileY * TILE + TILE / 2;
    this.facing = 0; // radians; 0 = east
    this.sneaking = false;
    this.moving = false;
    this.coins = COINS_PER_LEVEL;
    this.coinsThrown = [];
    this.stepPhase = 0;
  }

  tile() {
    return {
      x: Math.floor((this.x - GRID_X) / TILE),
      y: Math.floor((this.y - GRID_Y) / TILE),
    };
  }

  // What kind of ground is underfoot right now: 'floor', 'bush' or 'shadow'.
  groundKind(level) {
    const t = this.tile();
    const ch = tileAt(level, t.x, t.y);
    if (ch === 'B') return 'bush';
    if (ch === 'S') return 'shadow';
    return 'floor';
  }

  // Move one frame. Returns a flat noise object the game passes to guards:
  // { x, y, radius } when footsteps are audible this frame, else null.
  // (Flat, not nested — the game reads noise.x directly.)
  update(dt, level, input, sfx) {
    const move = input.moveVector();
    this.moving = move.x !== 0 || move.y !== 0;
    this.sneaking = input.sneakHeld;
    const speed = this.sneaking ? SNEAK_SPEED : WALK_SPEED;
    let noise = null;
    if (this.moving) {
      const dx = move.x * speed * dt;
      const dy = move.y * speed * dt;
      // Axis-separated: try x, then y, so walls slide instead of blocking.
      if (circleFits(level, GRID_X, GRID_Y, this.x + dx, this.y, PLAYER_RADIUS)) this.x += dx;
      if (circleFits(level, GRID_X, GRID_Y, this.x, this.y + dy, PLAYER_RADIUS)) this.y += dy;
      this.facing = Math.atan2(move.y, move.x);
      this.stepPhase += speed * dt;
      sfx.step(this.sneaking);
      noise = {
        x: this.x,
        y: this.y,
        radius: this.sneaking ? SNEAK_NOISE_RADIUS : WALK_NOISE_RADIUS,
      };
    }
    // Age thrown coins; a landed coin keeps ringing for a moment.
    for (const coin of this.coinsThrown) {
      if (coin.flying) {
        coin.t += dt / coin.flightTime;
        if (coin.t >= 1) {
          coin.t = 1;
          coin.flying = false;
          coin.ring = 1.0;
          sfx.coinLand();
        }
        coin.x = coin.fromX + (coin.toX - coin.fromX) * coin.t;
        coin.y = coin.fromY + (coin.toY - coin.fromY) * coin.t;
      } else if (coin.ring > 0) {
        coin.ring = Math.max(0, coin.ring - dt * 0.8);
      }
    }
    this.coinsThrown = this.coinsThrown.filter((c) => c.ring > 0 || c.flying);
    return noise;
  }

  // Throw a coin toward canvas point (cx, cy). Returns the coin or null
  // when the pouch is empty.
  throwCoin(cx, cy, sfx) {
    if (this.coins <= 0) return null;
    this.coins -= 1;
    const dx = cx - this.x;
    const dy = cy - this.y;
    const d = dist(this.x, this.y, cx, cy);
    const reach = Math.min(d, COIN_RANGE);
    const ux = d === 0 ? 1 : dx / d;
    const uy = d === 0 ? 0 : dy / d;
    const toX = this.x + ux * reach;
    const toY = this.y + uy * reach;
    const coin = {
      fromX: this.x,
      fromY: this.y,
      toX: clamp(toX, GRID_X + 8, GRID_X + BOARD_W - 8),
      toY: clamp(toY, GRID_Y + 8, GRID_Y + BOARD_H - 8),
      x: this.x,
      y: this.y,
      t: 0,
      flightTime: 0.35 + (reach / COIN_RANGE) * 0.25,
      flying: true,
      ring: 0,
    };
    this.coinsThrown.push(coin);
    sfx.coin();
    return coin;
  }

  // The loudest active coin ring right now, for guards to investigate.
  activeCoinNoise() {
    for (const coin of this.coinsThrown) {
      if (!coin.flying && coin.ring > 0) return { x: coin.toX, y: coin.toY, radius: COIN_NOISE_RADIUS };
    }
    return null;
  }
}
