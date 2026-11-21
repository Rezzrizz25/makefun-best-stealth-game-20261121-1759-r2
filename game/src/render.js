// All canvas drawing: the museum floor, vision cones, the thief, the
// guards, the HUD, and every screen (title, intro, pause, caught, clear,
// win). Pure drawing — no game logic lives here.

import {
  TILE,
  GRID_X,
  GRID_Y,
  BOARD_W,
  BOARD_H,
  CANVAS_W,
  CANVAS_H,
  CONE_RANGE,
  CONE_HALF_ANGLE,
  COLORS,
} from './config.js';
import { tileAt } from './world.js';
import { clamp } from './random.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCone(ctx, guard) {
  const color =
    guard.state === 'alerted'
      ? COLORS.coneAlert
      : guard.state === 'suspicious' || guard.state === 'investigate'
        ? COLORS.coneSuspicious
        : COLORS.cone;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.arc(guard.x, guard.y, CONE_RANGE, guard.facing - CONE_HALF_ANGLE, guard.facing + CONE_HALF_ANGLE);
  ctx.closePath();
  ctx.fill();
}

function drawBoard(ctx, game) {
  const level = game.level;
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  for (let ty = 0; ty < 12; ty++) {
    for (let tx = 0; tx < 32; tx++) {
      const ch = tileAt(level, tx, ty);
      const px = GRID_X + tx * TILE;
      const py = GRID_Y + ty * TILE;
      if (ch === '#') {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(px, py, TILE, 4);
      } else if (ch === 'C') {
        ctx.fillStyle = COLORS.crate;
        ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
        ctx.strokeStyle = COLORS.crateEdge;
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 2, py + 2, TILE - 4, TILE - 4);
        ctx.beginPath();
        ctx.moveTo(px + 2, py + 2);
        ctx.lineTo(px + TILE - 2, py + TILE - 2);
        ctx.moveTo(px + TILE - 2, py + 2);
        ctx.lineTo(px + 2, py + TILE - 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = (tx + ty) % 2 === 0 ? COLORS.floor : COLORS.floorAlt;
        ctx.fillRect(px, py, TILE, TILE);
        if (ch === 'B') {
          ctx.fillStyle = COLORS.bush;
          ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
          ctx.fillStyle = COLORS.bushLeaf;
          ctx.beginPath();
          ctx.arc(px + 11, py + 12, 6, 0, Math.PI * 2);
          ctx.arc(px + 21, py + 11, 6, 0, Math.PI * 2);
          ctx.arc(px + 16, py + 21, 6, 0, Math.PI * 2);
          ctx.fill();
        } else if (ch === 'S') {
          ctx.fillStyle = COLORS.shadow;
          ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
          ctx.strokeStyle = COLORS.shadowEdge;
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 4, py + 4, TILE - 8, TILE - 8);
        }
      }
    }
  }
  // Board frame.
  ctx.strokeStyle = '#2c355e';
  ctx.lineWidth = 2;
  ctx.strokeRect(GRID_X - 1, GRID_Y - 1, BOARD_W + 2, BOARD_H + 2);
}

function drawExit(ctx, game) {
  const ex = game.level.exit;
  const px = GRID_X + ex.x * TILE;
  const py = GRID_Y + ex.y * TILE;
  const open = game.intelLeft() === 0;
  ctx.fillStyle = open ? COLORS.exitOpen : COLORS.exitClosed;
  ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
  ctx.strokeStyle = open ? '#a9f5c6' : '#8a5a5a';
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 3, py + 3, TILE - 6, TILE - 6);
  ctx.fillStyle = open ? '#0c2b18' : '#e8c9c9';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(open ? 'EXIT' : 'LOCK', px + TILE / 2, py + TILE / 2 + 1);
  if (open) {
    const pulse = 0.5 + 0.5 * Math.sin(game.time * 4);
    ctx.strokeStyle = `rgba(47, 174, 95, ${0.35 + pulse * 0.4})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(px - 2, py - 2, TILE + 4, TILE + 4);
  }
}

function drawIntel(ctx, game) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const item of game.intelItems) {
    if (item.taken) continue;
    const px = GRID_X + item.x * TILE + TILE / 2;
    const py = GRID_Y + item.y * TILE + TILE / 2;
    const bob = Math.sin(game.time * 3 + item.x) * 2;
    ctx.fillStyle = COLORS.intel;
    ctx.fillRect(px - 8, py - 10 + bob, 16, 20);
    ctx.strokeStyle = 'rgba(255, 217, 74, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px - 8, py - 10 + bob, 16, 20);
    // Label in bright yellow with a dark outline, so it reads on the file
    // and on the dark floor alike.
    ctx.font = 'bold 10px sans-serif';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#3a2f00';
    ctx.strokeText('INTEL', px, py + bob);
    ctx.fillStyle = COLORS.intel;
    ctx.fillText('INTEL', px, py + bob);
  }
}

function drawCoins(ctx, game) {
  for (const coin of game.player.coinsThrown) {
    const alpha = coin.flying ? 1 : 0.4 + coin.ring * 0.6;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = COLORS.coin;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a7433';
    ctx.lineWidth = 1;
    ctx.stroke();
    if (!coin.flying && coin.ring > 0) {
      ctx.strokeStyle = `rgba(216, 194, 106, ${coin.ring})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(coin.toX, coin.toY, 8 + (1 - coin.ring) * 46, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function drawGuards(ctx, game) {
  for (const guard of game.guards) {
    drawCone(ctx, guard);
    // Body.
    ctx.fillStyle =
      guard.state === 'alerted'
        ? COLORS.guardAlert
        : guard.state === 'suspicious' || guard.state === 'investigate'
          ? COLORS.guardSuspicious
          : COLORS.guard;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2b0d0f';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Facing tick.
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.facing) * 16, guard.y + Math.sin(guard.facing) * 16);
    ctx.stroke();
    // Detection ring over the head.
    if (guard.detection > 0.02) {
      const w = 30;
      const x = guard.x - w / 2;
      const y = guard.y - 26;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(x, y, w, 5);
      ctx.fillStyle = guard.detection >= 1 ? '#ff2e3f' : guard.detection >= 0.35 ? '#f5a524' : '#ffd94a';
      ctx.fillRect(x, y, w * clamp(guard.detection, 0, 1), 5);
    }
    // "?" or "!" above the head.
    if (guard.state === 'suspicious' || guard.state === 'investigate') {
      ctx.fillStyle = '#f5a524';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', guard.x, guard.y - 32);
    } else if (guard.state === 'alerted') {
      ctx.fillStyle = '#ff2e3f';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', guard.x, guard.y - 32);
    }
  }
}

function drawPlayer(ctx, game) {
  const p = game.player;
  const inBush = p.groundKind(game.level) === 'bush';
  ctx.globalAlpha = inBush ? 0.55 : 1;
  ctx.fillStyle = p.sneaking ? COLORS.playerSneak : COLORS.player;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#11141f';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Hood point showing facing.
  ctx.fillStyle = '#11141f';
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.facing) * 8, p.y + Math.sin(p.facing) * 8, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (p.sneaking) {
    ctx.fillStyle = COLORS.playerSneak;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SNEAK', p.x, p.y - 18);
  }
}

function drawHud(ctx, game) {
  ctx.fillStyle = 'rgba(8, 10, 20, 0.92)';
  ctx.fillRect(0, 0, CANVAS_W, 40);
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const intelGot = game.intelItems.length - game.intelLeft();
  ctx.fillText(`LEVEL ${game.levelIndex + 1}/3  ${game.level.name}`, 16, 21);
  ctx.fillText(`INTEL ${intelGot}/${game.intelItems.length}`, 300, 21);
  ctx.fillText(`COINS ${game.player.coins}`, 470, 21);
  const mins = Math.floor(game.time / 60);
  const secs = Math.floor(game.time % 60);
  ctx.fillText(`TIME ${mins}:${String(secs).padStart(2, '0')}`, 600, 21);
  ctx.fillText(`ALARMS ${game.alarms}`, 730, 21);
  // Detection meter: the highest guard meter.
  const top = game.guards.reduce((m, g) => Math.max(m, g.detection), 0);
  ctx.fillStyle = '#2a2f4a';
  ctx.fillRect(880, 12, 180, 16);
  ctx.fillStyle = top >= 1 ? '#ff2e3f' : top >= 0.35 ? '#f5a524' : '#ffd94a';
  ctx.fillRect(880, 12, 180 * clamp(top, 0, 1), 16);
  ctx.strokeStyle = '#4d578a';
  ctx.lineWidth = 1;
  ctx.strokeRect(880, 12, 180, 16);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '12px sans-serif';
  ctx.fillText('SEEN', 1070, 21);
  ctx.fillStyle = game.sfx.muted ? COLORS.danger : COLORS.hudDim;
  ctx.textAlign = 'right';
  ctx.fillText(game.sfx.muted ? 'MUTED (M)' : 'M: MUTE', 1264, 21);
  ctx.textAlign = 'left';
  // Bottom hint line.
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '12px sans-serif';
  ctx.fillText(
    'WASD / arrows move · Shift sneak · Click throws a coin · P pause · R retry · M mute',
    16,
    CANVAS_H - 14,
  );
  if (game.intelLeft() === 0) {
    ctx.fillStyle = '#2fae5f';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT OPEN — GET TO THE GREEN DOOR', CANVAS_W / 2, CANVAS_H - 14);
    ctx.textAlign = 'left';
  }
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(5, 7, 14, 0.78)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accent || '#ffd94a';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(title, CANVAS_W / 2, 150);
  ctx.fillStyle = COLORS.hud;
  ctx.font = '17px sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, CANVAS_W / 2, 210 + i * 28);
  });
  ctx.textAlign = 'left';
}

export function render(ctx, game) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  const s = game.screen;
  if (s === 'title') {
    drawBoard(ctx, game);
    drawExit(ctx, game);
    drawIntel(ctx, game);
    drawGuards(ctx, game);
    drawPlayer(ctx, game);
    overlay(ctx, 'NIGHTSHADE', ['The Silent Vault', '', 'You are Wren, a thief in a sleeping museum.', 'Lift every intel file. Reach the exit. Do not get seen.', '', 'Press ENTER to begin'], '#ffd94a');
    return;
  }
  if (s === 'intro') {
    drawBoard(ctx, game);
    drawGuards(ctx, game);
    drawPlayer(ctx, game);
    overlay(
      ctx,
      `LEVEL ${game.levelIndex + 1}: ${game.level.name.toUpperCase()}`,
      [game.level.briefing, '', 'WASD / arrows — move      Shift — sneak (slow, quiet, hard to see)', 'Click — throw a coin to distract a guard      P — pause', '', 'Press ENTER to slip in'],
      '#dfe6ff',
    );
    return;
  }
  if (s === 'win') {
    drawBoard(ctx, game);
    overlay(
      ctx,
      'THE VAULT IS YOURS',
      [`Every file lifted, every guard fooled. Wren vanishes into the night.`, '', `Time ${game.totalTimeText()} · Alarms raised: ${game.alarms}`, '', 'Press ENTER to play again'],
      '#2fae5f',
    );
    return;
  }
  // playing, paused, caught, clear — the board is always visible.
  drawBoard(ctx, game);
  drawExit(ctx, game);
  drawIntel(ctx, game);
  drawCoins(ctx, game);
  drawGuards(ctx, game);
  drawPlayer(ctx, game);
  drawHud(ctx, game);
  if (s === 'paused') {
    overlay(ctx, 'PAUSED', ['Take a breath. The guards wait for no one — except now.', '', 'Press P to resume'], '#dfe6ff');
  } else if (s === 'caught') {
    overlay(ctx, 'CAUGHT!', ['A guard got a hand on you. The vault keeps its secrets — this time.', '', 'Press R to try the level again'], '#ff5a6e');
  } else if (s === 'clear') {
    overlay(
      ctx,
      'LEVEL CLEAR',
      [`${game.level.name} — clean. The intel is yours.`, '', `Time ${game.totalTimeText()} · Alarms raised: ${game.alarms}`, '', 'Press ENTER for the next floor'],
      '#2fae5f',
    );
  }
}
