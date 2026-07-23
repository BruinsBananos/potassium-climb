/** Lightweight WebAudio: unlock + procedural SFX + optional music oscillator bed. */

export class AudioEngine {
  ctx: AudioContext | null = null;
  unlocked = false;
  musicGain = 0.7;
  sfxGain = 0.85;
  masterGain = 1;
  private musicNodes: OscillatorNode[] = [];
  private musicRunning = false;

  private ensure(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  async unlock(): Promise<void> {
    const ctx = this.ensure();
    if (ctx.state === 'suspended') await ctx.resume();
    this.unlocked = true;
  }

  setVolumes(music: number, sfx: number, master = 1): void {
    this.musicGain = music;
    this.sfxGain = sfx;
    this.masterGain = master;
  }

  private beep(
    freq: number,
    dur: number,
    type: OscillatorType = 'sine',
    gain = 0.15,
    bus: 'sfx' | 'music' = 'sfx',
  ): void {
    if (!this.unlocked) return;
    const ctx = this.ensure();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    const mul = (bus === 'music' ? this.musicGain : this.sfxGain) * this.masterGain;
    g.gain.value = gain * mul;
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
  }

  playCue(id: string): void {
    switch (id) {
      case 'jump':
        this.beep(320, 0.08, 'square', 0.08);
        break;
      case 'land_perfect':
        this.beep(880, 0.1, 'sine', 0.12);
        this.beep(1320, 0.12, 'triangle', 0.06);
        break;
      case 'land_great':
        this.beep(660, 0.08, 'sine', 0.1);
        break;
      case 'land_ok':
        this.beep(240, 0.06, 'triangle', 0.08);
        break;
      case 'land_scuff':
        this.beep(140, 0.1, 'sawtooth', 0.06);
        break;
      case 'wall':
        this.beep(400, 0.06, 'square', 0.07);
        break;
      case 'coin':
        this.beep(920 + Math.random() * 80, 0.07, 'sine', 0.09);
        break;
      case 'power':
        this.beep(520, 0.12, 'triangle', 0.1);
        this.beep(780, 0.14, 'sine', 0.06);
        break;
      case 'spike':
        this.beep(90, 0.2, 'sawtooth', 0.12);
        break;
      case 'spring':
        this.beep(300, 0.05, 'square', 0.08);
        this.beep(600, 0.12, 'sine', 0.08);
        break;
      case 'death':
        this.beep(200, 0.15, 'triangle', 0.1);
        this.beep(100, 0.25, 'sine', 0.08);
        break;
      case 'summit':
        this.beep(523, 0.12, 'sine', 0.1);
        this.beep(659, 0.14, 'sine', 0.09);
        this.beep(784, 0.2, 'sine', 0.1);
        break;
      case 'ui':
        this.beep(600, 0.04, 'sine', 0.05);
        break;
      case 'upgrade':
        this.beep(440, 0.08, 'triangle', 0.08);
        this.beep(660, 0.12, 'sine', 0.07);
        break;
      case 'combo':
        this.beep(500 + Math.random() * 200, 0.06, 'square', 0.05);
        break;
      case 'newbest':
        this.beep(660, 0.1, 'sine', 0.1);
        this.beep(880, 0.12, 'triangle', 0.09);
        this.beep(1175, 0.18, 'sine', 0.08);
        break;
      default:
        this.beep(440, 0.05, 'sine', 0.05);
    }
  }

  startMusic(): void {
    if (!this.unlocked || this.musicRunning) return;
    const ctx = this.ensure();
    this.musicRunning = true;
    // soft drone + fifth
    const mk = (f: number, gAmt: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.value = gAmt * this.musicGain * this.masterGain;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      this.musicNodes.push(o);
    };
    mk(110, 0.03);
    mk(165, 0.02);
    mk(220, 0.015);
  }

  stopMusic(): void {
    for (const n of this.musicNodes) {
      try {
        n.stop();
      } catch {
        /* */
      }
    }
    this.musicNodes = [];
    this.musicRunning = false;
  }
}
