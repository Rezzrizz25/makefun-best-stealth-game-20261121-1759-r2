// Keyboard and mouse state, kept as plain data the game reads each frame.
// WASD and arrows move; Shift sneaks; P pauses; R retries; M mutes; Enter
// advances screens. A mouse click is a coin throw — the game reads the
// click position in canvas pixels and converts it to the world itself.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.sneakHeld = false;
    this.clickQueue = []; // {x, y} canvas-pixel clicks, consumed by the game
    this.pressedQueue = []; // key codes pressed since last read, consumed once
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (!e.repeat) this.pressedQueue.push(e.code);
      this.keys.add(e.code);
      this.sneakHeld = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      this.sneakHeld = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.sneakHeld = false;
    });
    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
      this.clickQueue.push({ x, y });
    });
  }

  // -1, 0 or 1 on each axis from the held movement keys.
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.hypot(x, y);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  isMoving() {
    return this.moveVector().x !== 0 || this.moveVector().y !== 0;
  }

  // True once per physical press; the game drains this every frame.
  pressed(code) {
    const i = this.pressedQueue.indexOf(code);
    if (i === -1) return false;
    this.pressedQueue.splice(i, 1);
    return true;
  }

  drainClicks() {
    const clicks = this.clickQueue;
    this.clickQueue = [];
    return clicks;
  }

  clearQueues() {
    this.clickQueue = [];
    this.pressedQueue = [];
  }
}
