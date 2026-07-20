/**
 * Synthesized sound effects.
 *
 * There are no audio files in this project — every sound is generated with
 * WebAudio oscillators at play time. That keeps the repo asset-free and
 * makes each sound tweakable by editing numbers rather than re-recording.
 *
 * Browsers block audio until the user interacts with the page, so `unlock()`
 * must be called from a real pointer/key event before anything will be heard.
 */

/** Master volume for the whole game. Kept gentle — this is for children. */
const MASTER_VOLUME = 0.22;

class SoundBoard {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;

  /**
   * Creates (or resumes) the audio context. Safe to call repeatedly.
   * Must originate from a user gesture the first time.
   */
  unlock(): void {
    try {
      if (this.ctx === null) {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = MASTER_VOLUME;
        this.master.connect(this.ctx.destination);
      }
      // Contexts can start (or fall back to) "suspended" on mobile.
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      // No WebAudio available. The game is fully playable in silence.
      this.ctx = null;
    }
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /** Flips mute and returns the new state. */
  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master !== null) {
      this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
    }
    return this.muted;
  }

  /**
   * Plays a single tone.
   *
   * @param startFreq Frequency in Hz at the start of the note.
   * @param endFreq   Frequency it glides to (same value = steady pitch).
   * @param duration  Length in seconds.
   * @param type      Oscillator waveform.
   * @param delay     Seconds to wait before playing, for building arpeggios.
   * @param volume    Relative volume, 0..1.
   */
  private tone(
    startFreq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType = 'sine',
    delay = 0,
    volume = 1,
  ): void {
    if (this.ctx === null || this.master === null || this.muted) return;
    const ctx = this.ctx;
    const start = ctx.currentTime + delay;

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, start);
    if (endFreq !== startFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), start + duration);
    }

    // A quick attack and a smooth decay — avoids the click you get from
    // starting or stopping a raw oscillator at full amplitude.
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + Math.min(0.02, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  /** Short filtered noise burst — used for pops and purrs. */
  private noise(duration: number, filterFreq: number, volume = 1, delay = 0): void {
    if (this.ctx === null || this.master === null || this.muted) return;
    const ctx = this.ctx;
    const start = ctx.currentTime + delay;

    const frames = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      // White noise that fades out across the buffer.
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;

    const gain = ctx.createGain();
    gain.gain.value = volume;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(start);
  }

  /* --- The game's sound vocabulary ---------------------------------- */

  /** Soft click for buttons and portals. */
  tap(): void {
    this.tone(660, 880, 0.08, 'triangle', 0, 0.5);
  }

  /** Balloon pop: a noise burst plus a quick downward blip. */
  pop(): void {
    this.noise(0.12, 1800, 0.9);
    this.tone(900, 200, 0.1, 'square', 0, 0.35);
  }

  /** Rising three-note arpeggio for a correct answer. */
  correct(): void {
    this.tone(523, 523, 0.12, 'sine', 0, 0.7); // C5
    this.tone(659, 659, 0.12, 'sine', 0.09, 0.7); // E5
    this.tone(784, 784, 0.22, 'sine', 0.18, 0.7); // G5
  }

  /**
   * Wrong answer: a soft, low "boop".
   * Deliberately gentle and short — never a buzzer, never harsh.
   */
  wrong(): void {
    this.tone(300, 220, 0.18, 'sine', 0, 0.4);
  }

  /** Contented cat purr: low wobbling noise in two pulses. */
  purr(): void {
    this.noise(0.22, 220, 0.55);
    this.noise(0.22, 200, 0.5, 0.24);
    this.tone(110, 96, 0.45, 'triangle', 0, 0.28);
  }

  /** Level-up flourish when the difficulty tier increases. */
  levelUp(): void {
    this.tone(523, 523, 0.1, 'triangle', 0, 0.55);
    this.tone(698, 698, 0.1, 'triangle', 0.08, 0.55);
    this.tone(880, 880, 0.1, 'triangle', 0.16, 0.55);
    this.tone(1047, 1047, 0.28, 'triangle', 0.24, 0.6);
  }

  /** Big fanfare when a new pet is won. */
  reward(): void {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((freq, i) => {
      this.tone(freq, freq, 0.3, 'triangle', i * 0.11, 0.6);
    });
    this.noise(0.5, 4000, 0.25, 0.5);
  }

  /** A quiet swoosh for scene transitions and drag pickups. */
  whoosh(): void {
    this.noise(0.18, 900, 0.35);
  }
}

/** The single soundboard used across the game. */
export const sfx = new SoundBoard();
