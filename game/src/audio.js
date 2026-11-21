// Synthesized sound: every effect is a small WebAudio oscillator envelope,
// so the game needs no audio files and makes no network requests. All calls
// are safe before any user gesture — a missing or suspended AudioContext
// just means silence.

export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.lastStep = 0;
  }

  ensure() {
    if (this.ctx) return this.ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  unlock() {
    const ctx = this.ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  tone(freq, dur, type, gain, when = 0, slideTo = null) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    try {
      const t0 = ctx.currentTime + when;
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      amp.gain.setValueAtTime(0.0001, t0);
      amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
      amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(amp);
      amp.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch {
      // Audio is decoration; a failure here must never break the game.
    }
  }

  // Soft alternating footstep ticks, throttled so they stay footsteps.
  step(sneaking) {
    const now = performance.now();
    if (now - this.lastStep < (sneaking ? 340 : 210)) return;
    this.lastStep = now;
    this.tone(sneaking ? 150 : 190, 0.07, 'sine', sneaking ? 0.03 : 0.06);
  }

  coin() {
    this.tone(1900, 0.09, 'triangle', 0.1);
    this.tone(2500, 0.14, 'triangle', 0.08, 0.07);
  }

  coinLand() {
    this.tone(1150, 0.06, 'square', 0.05);
  }

  pickup() {
    this.tone(660, 0.1, 'sine', 0.09);
    this.tone(990, 0.16, 'sine', 0.09, 0.08);
  }

  alert() {
    this.tone(220, 0.32, 'sawtooth', 0.1, 0, 440);
    this.tone(330, 0.28, 'sawtooth', 0.07, 0.1, 520);
  }

  caught() {
    this.tone(392, 0.22, 'sawtooth', 0.11, 0, 196);
    this.tone(196, 0.5, 'sawtooth', 0.11, 0.2, 98);
  }

  clear() {
    [523, 659, 784].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.09, i * 0.11));
  }

  win() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.09, i * 0.13));
  }

  door() {
    this.tone(140, 0.25, 'sine', 0.08, 0, 320);
  }
}
