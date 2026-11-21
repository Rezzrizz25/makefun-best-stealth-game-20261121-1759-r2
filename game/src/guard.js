// A museum guard: walks a waypoint loop, watches a vision cone, and runs
// a small state machine — patrol, suspicious, alerted (chase), investigate.
// Detection is a meter, not a switch: being seen fills it, hiding drains it.

import {
  TILE,
  GRID_X,
  GRID_Y,
  GUARD_PATROL_SPEED,
  GUARD_CHASE_SPEED,
  GUARD_INVESTIGATE_SPEED,
  GUARD_CATCH_RADIUS,
  CONE_RANGE,
  CONE_HALF_ANGLE,
  DETECT_FILL,
  DETECT_DECAY,
  SUSPICIOUS_AT,
  ALERT_AT,
  LOSE_SIGHT_AFTER,
  BUSH_VISIBILITY,
  SHADOW_VISIBILITY,
  SNEAK_VISIBILITY,
  MOVING_VISIBILITY,
} from './config.js';
import { circleFits, hasLineOfSight } from './world.js';
import { angleDelta, clamp, dist } from './random.js';

function tileCenter(tx, ty) {
  return { x: GRID_X + tx * TILE + TILE / 2, y: GRID_Y + ty * TILE + TILE / 2 };
}

export class Guard {
  constructor(def) {
    this.waypoints = def.waypoints.map((w) => tileCenter(w.x, w.y));
    this.waypointIndex = 0;
    const start = this.waypoints[0];
    this.x = start.x;
    this.y = start.y;
    const next = this.waypoints[1 % this.waypoints.length];
    this.facing = Math.atan2(next.y - start.y, next.x - start.x);
    this.state = 'patrol'; // patrol | suspicious | alerted | investigate
    this.detection = 0;
    this.unseenTime = 0;
    this.investigateTarget = null;
    this.investigateWait = 0;
    this.lastSeen = null;
    this.scanPhase = 0;
  }

  reset() {
    const start = this.waypoints[0];
    this.x = start.x;
    this.y = start.y;
    this.waypointIndex = 0;
    const next = this.waypoints[1 % this.waypoints.length];
    this.facing = Math.atan2(next.y - start.y, next.x - start.x);
    this.state = 'patrol';
    this.detection = 0;
    this.unseenTime = 0;
    this.investigateTarget = null;
    this.investigateWait = 0;
    this.lastSeen = null;
  }

  // How visible the player is to this guard right now: 0 when out of the
  // cone, out of range, or behind a wall; otherwise a 0..1-ish factor from
  // distance, cover and posture.
  visibilityOf(level, player) {
    const d = dist(this.x, this.y, player.x, player.y);
    if (d > CONE_RANGE) return 0;
    const angleTo = Math.atan2(player.y - this.y, player.x - this.x);
    if (Math.abs(angleDelta(this.facing, angleTo)) > CONE_HALF_ANGLE) return 0;
    if (!hasLineOfSight(level, GRID_X, GRID_Y, this.x, this.y, player.x, player.y)) return 0;
    let vis = 1 - (d / CONE_RANGE) * 0.55;
    const ground = player.groundKind(level);
    if (ground === 'bush') vis *= BUSH_VISIBILITY;
    if (ground === 'shadow') vis *= SHADOW_VISIBILITY;
    if (player.sneaking) vis *= SNEAK_VISIBILITY;
    if (player.moving && !player.sneaking) vis *= MOVING_VISIBILITY;
    return clamp(vis, 0, 1.2);
  }

  // Walk toward (tx, ty) at `speed`, sliding along walls. Returns true when
  // arrived (within 4px).
  stepToward(level, tx, ty, speed, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 4) return true;
    const step = Math.min(d, speed * dt);
    const nx = this.x + (dx / d) * step;
    const ny = this.y + (dy / d) * step;
    if (circleFits(level, GRID_X, GRID_Y, nx, this.y, 12)) this.x = nx;
    if (circleFits(level, GRID_X, GRID_Y, this.x, ny, 12)) this.y = ny;
    this.facing = Math.atan2(dy, dx);
    return Math.hypot(tx - this.x, ty - this.y) < 4;
  }

  // One frame. `player` is the Player, `noise` a flat {x,y,radius} footstep
  // event or null, `coinNoise` the same for a landed coin. Returns an event
  // string for the game to react to: 'alerted', 'caught', or null.
  update(dt, level, player, noise, coinNoise, sfx) {
    const vis = this.visibilityOf(level, player);
    let event = null;
    if (vis > 0) {
      this.detection = clamp(this.detection + DETECT_FILL * vis * dt, 0, 1);
      this.unseenTime = 0;
      this.lastSeen = { x: player.x, y: player.y };
    } else {
      this.detection = clamp(this.detection - DETECT_DECAY * dt, 0, 1);
      this.unseenTime += dt;
    }

    if (this.state !== 'alerted' && this.detection >= ALERT_AT) {
      this.state = 'alerted';
      this.unseenTime = 0;
      event = 'alerted';
      sfx.alert();
    } else if (this.state === 'patrol' && this.detection >= SUSPICIOUS_AT) {
      this.state = 'suspicious';
      this.investigateTarget = this.lastSeen ? { ...this.lastSeen } : { x: player.x, y: player.y };
    }

    // Noise the guard can hear pulls it off patrol to look.
    const heard = coinNoise || (noise && dist(this.x, this.y, noise.x, noise.y) <= noise.radius + 40 ? noise : null);
    if (heard && this.state !== 'alerted') {
      this.state = 'investigate';
      this.investigateTarget = { x: heard.x, y: heard.y };
      this.investigateWait = 2.5; // seconds spent looking at the noise
    }

    if (this.state === 'patrol') {
      const target = this.waypoints[this.waypointIndex];
      if (this.stepToward(level, target.x, target.y, GUARD_PATROL_SPEED, dt)) {
        this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
      }
    } else if (this.state === 'suspicious') {
      const target = this.investigateTarget;
      if (target && this.stepToward(level, target.x, target.y, GUARD_INVESTIGATE_SPEED, dt)) {
        this.state = 'investigate';
        this.investigateWait = 1.6;
      } else if (!target) {
        this.state = 'patrol';
      }
    } else if (this.state === 'investigate') {
      if (this.investigateTarget) {
        this.stepToward(level, this.investigateTarget.x, this.investigateTarget.y, GUARD_INVESTIGATE_SPEED, dt);
      }
      this.investigateWait -= dt;
      this.scanPhase += dt;
      // Look around while waiting, then go back to the loop.
      this.facing += Math.sin(this.scanPhase * 2.2) * 0.9 * dt;
      if (this.investigateWait <= 0) {
        this.state = 'patrol';
        this.investigateTarget = null;
      }
    } else if (this.state === 'alerted') {
      // Chase the player's live position; give up after losing sight.
      this.stepToward(level, player.x, player.y, GUARD_CHASE_SPEED, dt);
      if (this.unseenTime >= LOSE_SIGHT_AFTER) {
        this.state = 'patrol';
        this.detection = 0.4;
      }
    }

    // Touching the player ends the run.
    if (dist(this.x, this.y, player.x, player.y) <= GUARD_CATCH_RADIUS) {
      event = 'caught';
    }
    return event;
  }
}
