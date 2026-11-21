# NIGHTSHADE: The Silent Vault

A complete top-down stealth game for the make.fun bounty **"Make the best stealth game"** (`best-stealth-game-20261121-1759`). You are Wren, a thief slipping through three guarded museum floors at night. Lift every intel file, then reach the exit — without ever being seen.

## How to play

Serve the game locally (Node 22, no dependencies, no build step):

```sh
node serve.ts
# open http://localhost:8080
```

- **WASD / arrow keys** — move
- **Shift** — sneak: slower, quieter, harder to spot
- **Click** — throw a coin; the clink pulls nearby guards to investigate
- **P** — pause · **R** — retry after being caught · **M** — mute · **Enter** — advance screens

## The stealth

- **Guards patrol waypoint loops** with visible vision cones. Their AI runs four states: **patrol → suspicious** (the detection meter fills and the guard comes to look) **→ alerted** (a chase, with an alarm counted) **→ investigate** (drawn by footsteps or a thrown coin), then back to patrol once they lose you.
- **Seeing is a meter, not a switch.** Distance, line of sight (walls and crates block it), and light all matter: standing in a **bush** nearly hides you, a **shadow** patch helps a lot, and sneaking helps more. Walking upright across open floor in front of a guard fills the meter fast.
- **Noise matters.** Walking footsteps carry; sneaking barely whispers. A thrown coin lands with a noise ring every nearby guard will check out — spend the three coins per level wisely.
- **The exit stays locked** until every intel file on the floor is lifted.

## The three floors

| Floor | Intel | Guards | Character |
| --- | --- | --- | --- |
| 1. The Atrium | 3 | 2 | A gentle introduction: open floor, slow loops, bushes to learn in. |
| 2. The Gallery | 4 | 3 | Tighter patrols, a long hall with nowhere to hide, and a wall of portraits watching. |
| 3. The Vault | 5 | 3 | Crates everywhere, three overlapping patrols, and five files to lift. |

Clear all three floors and Wren vanishes into the night.

## Presentation

- **HUD:** intel collected, coins left, timer, alarms raised, and a live detection meter.
- **Screens:** title, per-level briefing, level clear, caught, win, and pause.
- **Sound:** fully synthesized WebAudio effects (footsteps, coin clinks, alert sting, pickup chime, win arpeggio) — no audio files, no network.
- **Deterministic screenshots:** `?shot=start|play|end&seed=1` stages a fixed scene for capture; `shots.json` lists the three shots.

## Files

```
main.ts            hand-in program: copies game/ + screenshots/ to /output, writes dossier.json
serve.ts           tiny static server for local play-testing
shots.json         the three deterministic screenshot stagings
game/
  index.html       page shell (1280x480 canvas)
  src/
    config.js      tuning constants (speeds, cone, detection, noise, colors)
    random.js      seeded RNG + math helpers
    world.js       the three 32x12 maps, line of sight, BFS reachability checks
    player.js      Wren: movement, sneaking, coin throws
    guard.js       guard AI: patrol / suspicious / alerted / investigate
    audio.js       synthesized WebAudio sound effects
    input.js       keyboard + mouse state
    render.js      all canvas drawing: board, cones, HUD, screens
    main.js        game orchestration, screen state machine, ?shot= staging
vendor/
  makefun-game.ts  make.fun's dossier library (vendored, unchanged)
screenshots/      three 1280x480 JPEG renders of the game's own code
```

## License

MIT — see `LICENSE`.
