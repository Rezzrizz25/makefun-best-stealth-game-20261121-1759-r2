// NIGHTSHADE: The Silent Vault — game orchestration. Owns the screen state
// machine, the per-frame update, level loading, and the deterministic
// ?shot= staging used for screenshots. The pieces (world, player, guards,
// audio, input, render) do the work; this file wires them together.

import { TILE, GRID_X, GRID_Y, COINS_PER_LEVEL } from './config.js';
import { LEVELS, tileAt } from './world.js';
import { Player } from './player.js';
import { Guard } from './guard.js';
import { Sfx } from './audio.js';
import { Input } from './input.js';
import { render } from './render.js';
import { makeRng } from './random.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sfx = new Sfx();
    this.input = new Input(canvas);
    this.levelIndex = 0;
    this.level = LEVELS[0];
    this.player = new Player(this.level);
    this.guards = this.level.guards.map((g) => new Guard(g));
    this.intelItems = this.level.intel.map((p) => ({ x: p.x, y: p.y, taken: false }));
    this.screen = 'title'; // title | intro | playing | paused | caught | clear | win
    this.time = 0; // seconds on the current level
    this.totalTime = 0; // seconds across the whole run
    this.alarms = 0;
    this.lastTs = 0;
    this.rng = makeRng(1);
    this.shotMode = false;
    this.ready = false;
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.level = LEVELS[index];
    this.player = new Player(this.level);
    this.guards = this.level.guards.map((g) => new Guard(g));
    this.intelItems = this.level.intel.map((p) => ({ x: p.x, y: p.y, taken: false }));
    this.time = 0;
    this.input.clearQueues();
  }

  intelLeft() {
    return this.intelItems.filter((i) => !i.taken).length;
  }

  totalTimeText() {
    const t = this.totalTime;
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  startRun() {
    this.alarms = 0;
    this.totalTime = 0;
    this.loadLevel(0);
    this.screen = 'intro';
  }

  retryLevel() {
    this.loadLevel(this.levelIndex);
    this.screen = 'playing';
  }

  nextLevel() {
    if (this.levelIndex + 1 >= LEVELS.length) {
      this.screen = 'win';
      this.sfx.win();
      return;
    }
    this.loadLevel(this.levelIndex + 1);
    this.screen = 'intro';
  }

  // One frame of the playing state: movement, noise, guards, pickups, exit.
  updatePlaying(dt) {
    this.time += dt;
    this.totalTime += dt;
    const noise = this.player.update(dt, this.level, this.input, this.sfx);
    const coinNoise = this.player.activeCoinNoise();

    for (const click of this.input.drainClicks()) {
      this.player.throwCoin(click.x, click.y, this.sfx);
    }

    for (const guard of this.guards) {
      const event = guard.update(dt, this.level, this.player, noise, coinNoise, this.sfx);
      if (event === 'alerted') this.alarms += 1;
      if (event === 'caught') {
        this.screen = 'caught';
        this.sfx.caught();
        return;
      }
    }

    // Intel pickups: walk over a file to lift it.
    const pt = this.player.tile();
    for (const item of this.intelItems) {
      if (!item.taken && item.x === pt.x && item.y === pt.y) {
        item.taken = true;
        this.sfx.pickup();
      }
    }

    // The exit only works once every intel file is lifted.
    const ex = this.level.exit;
    if (this.intelLeft() === 0 && pt.x === ex.x && pt.y === ex.y) {
      this.screen = 'clear';
      this.sfx.clear();
      if (this.levelIndex === LEVELS.length - 1) this.sfx.door();
    }
  }

  // Screen transitions from keys. Called every frame; each press is
  // consumed once by Input.pressed.
  handleKeys() {
    const input = this.input;
    if (input.pressed('KeyM')) this.sfx.toggleMute();
    if (this.screen === 'title') {
      if (input.pressed('Enter') || input.pressed('Space')) {
        this.sfx.unlock();
        this.startRun();
      }
      return;
    }
    if (this.screen === 'intro') {
      if (input.pressed('Enter') || input.pressed('Space')) {
        this.sfx.unlock();
        this.screen = 'playing';
      }
      return;
    }
    if (this.screen === 'playing') {
      if (input.pressed('KeyP') || input.pressed('Escape')) {
        this.screen = 'paused';
        input.clearQueues();
      }
      return;
    }
    if (this.screen === 'paused') {
      if (input.pressed('KeyP') || input.pressed('Escape') || input.pressed('Enter')) {
        this.screen = 'playing';
        input.clearQueues();
      }
      return;
    }
    if (this.screen === 'caught') {
      if (input.pressed('KeyR') || input.pressed('Enter')) this.retryLevel();
      return;
    }
    if (this.screen === 'clear') {
      if (input.pressed('Enter') || input.pressed('Space')) this.nextLevel();
      return;
    }
    if (this.screen === 'win') {
      if (input.pressed('Enter') || input.pressed('Space')) {
        this.startRun();
        this.screen = 'playing';
      }
    }
  }

  frame(ts) {
    const dt = Math.min(0.05, Math.max(0, (ts - this.lastTs) / 1000 || 0.016));
    this.lastTs = ts;
    this.handleKeys();
    if (this.screen === 'playing') this.updatePlaying(dt);
    render(this.ctx, this);
  }

  run() {
    const loop = (ts) => {
      this.frame(ts);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // Deterministic staging for screenshots (?shot=start|play|end&seed=N).
  // No clock runs: the scene is posed once and rendered once, so repeated
  // captures are byte-identical.
  stageShot(name, seed) {
    this.shotMode = true;
    this.rng = makeRng(seed || 1);
    this.time = 0;
    this.totalTime = 0;
    this.alarms = 0;
    if (name === 'start') {
      this.loadLevel(0);
      this.screen = 'title';
    } else if (name === 'play') {
      this.loadLevel(1);
      this.screen = 'playing';
      // Pose Wren mid-gallery, sneaking past a patrol, one intel lifted.
      this.player.x = GRID_X + 9 * TILE + TILE / 2;
      this.player.y = GRID_Y + 8 * TILE + TILE / 2;
      this.player.sneaking = true;
      this.player.facing = Math.PI / 2;
      this.player.coins = COINS_PER_LEVEL - 1;
      this.intelItems[0].taken = true;
      this.time = 137;
      this.totalTime = 137;
      const g = this.guards[1];
      g.x = GRID_X + 16 * TILE + TILE / 2;
      g.y = GRID_Y + 8 * TILE + TILE / 2;
      g.facing = Math.PI;
      g.state = 'suspicious';
      g.detection = 0.62;
      g.investigateTarget = { x: this.player.x, y: this.player.y };
      const g0 = this.guards[0];
      g0.x = GRID_X + 8 * TILE + TILE / 2;
      g0.y = GRID_Y + 3 * TILE + TILE / 2;
      g0.facing = Math.PI / 2;
    } else {
      // 'end': the win screen after a clean run.
      this.loadLevel(2);
      this.screen = 'win';
      this.totalTime = 418;
      this.alarms = 1;
      this.intelItems.forEach((i) => {
        i.taken = true;
      });
    }
    render(this.ctx, this);
    this.ready = true;
  }
}

// Boot: parse the query string for a shot request, else run the live game.
const canvas = document.getElementById('game');
const game = new Game(canvas);
window.NIGHTSHADE = game;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  const seed = Number(params.get('seed') || '1');
  game.stageShot(shot, Number.isFinite(seed) ? seed : 1);
  window.__shotReady = true;
} else {
  game.run();
  window.__shotReady = true;
}
