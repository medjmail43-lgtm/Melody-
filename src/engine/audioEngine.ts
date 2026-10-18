/**
 * Audio Engine: High-quality Web Audio API synthesis, accurate scheduling, instruments, and playback controls
 */

import { Note, Chord, InstrumentType, TICKS_PER_QUARTER } from '../types/music';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private dryGain: GainNode | null = null;

  // Playback state
  private isPlaying = false;
  private startAudioTime = 0;
  private startTickOffset = 0;
  private currentBpm = 110;
  private totalBars = 4;
  private isLooping = true;
  private metronomeEnabled = false;
  private melodyMuted = false;
  private chordsMuted = false;

  // Active scheduled nodes to cancel on stop
  private activeVoices: { stop: (time: number) => void }[] = [];
  private animationFrameId: number | null = null;
  private onPlayheadUpdate?: (currentTick: number) => void;
  private onPlaybackStateChange?: (isPlaying: boolean) => void;

  // Instruments
  public melodyInstrument: InstrumentType = 'grand_piano';
  public chordInstrument: InstrumentType = 'warm_pad';

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  public init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

    // Algorithmic impulse response reverb for spatial depth
    this.reverbNode = this.ctx.createConvolver();
    this.reverbGain = this.ctx.createGain();
    this.dryGain = this.ctx.createGain();

    this.reverbGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    this.dryGain.gain.setValueAtTime(0.8, this.ctx.currentTime);

    this.generateSimpleReverbImpulse(1.8, 2.0);

    this.dryGain.connect(this.masterGain);
    if (this.reverbNode) {
      this.reverbNode.connect(this.reverbGain);
      this.reverbGain.connect(this.masterGain);
    }

    // Dynamics compressor / limiter to prevent any clipping distortion
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-3, this.ctx.currentTime);
    compressor.knee.setValueAtTime(10, this.ctx.currentTime);
    compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
    compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    compressor.release.setValueAtTime(0.15, this.ctx.currentTime);

    this.masterGain.connect(compressor);
    compressor.connect(this.ctx.destination);
  }

  private generateSimpleReverbImpulse(durationSec: number, decay: number) {
    if (!this.ctx || !this.reverbNode) return;
    const rate = this.ctx.sampleRate;
    const length = rate * durationSec;
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = length - i;
      const factor = Math.pow(n / length, decay);
      left[i] = (Math.random() * 2 - 1) * factor;
      right[i] = (Math.random() * 2 - 1) * factor;
    }
    this.reverbNode.buffer = impulse;
  }

  public setVolume(val: number) { // 0 - 1
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, val)), this.ctx.currentTime, 0.02);
    }
  }

  public setBpm(bpm: number) {
    this.currentBpm = bpm;
  }

  public setMetronome(enabled: boolean) {
    this.metronomeEnabled = enabled;
  }

  public setLooping(loop: boolean) {
    this.isLooping = loop;
  }

  public setMelodyMuted(muted: boolean) {
    this.melodyMuted = muted;
  }

  public setChordsMuted(muted: boolean) {
    this.chordsMuted = muted;
  }

  public subscribePlayhead(callback: (currentTick: number) => void) {
    this.onPlayheadUpdate = callback;
  }

  public subscribePlaybackState(callback: (isPlaying: boolean) => void) {
    this.onPlaybackStateChange = callback;
  }

  public ticksToSeconds(ticks: number, bpm: number = this.currentBpm): number {
    const beats = ticks / TICKS_PER_QUARTER;
    return (beats * 60) / bpm;
  }

  public secondsToTicks(seconds: number, bpm: number = this.currentBpm): number {
    const beats = (seconds * bpm) / 60;
    return Math.round(beats * TICKS_PER_QUARTER);
  }

  /**
   * Audition single note interactively (e.g. keyboard click or note drag)
   */
  public playNotePreview(midi: number, durationSec: number = 0.5, velocity: number = 100, instrument: InstrumentType = this.melodyInstrument) {
    this.init();
    if (!this.ctx) return;
    this.playInstrumentNote(midi, this.ctx.currentTime, durationSec, velocity, instrument);
  }

  /**
   * Audition chord polyphonically
   */
  public playChordPreview(chord: Chord, durationSec: number = 1.2, instrument: InstrumentType = this.chordInstrument) {
    this.init();
    if (!this.ctx) return;
    for (const pitch of chord.voicingNotes) {
      this.playInstrumentNote(pitch, this.ctx.currentTime, durationSec, 85, instrument);
    }
  }

  /**
   * Start playback from specified tick
   */
  public play(notes: Note[], chords: Chord[], bars: number, startFromTick: number = 0) {
    this.init();
    if (!this.ctx) return;
    this.stop(); // Clear any existing

    this.isPlaying = true;
    this.totalBars = bars;
    this.startTickOffset = startFromTick;
    this.startAudioTime = this.ctx.currentTime;
    const totalTicks = bars * 4 * TICKS_PER_QUARTER;

    // Schedule all notes within loop
    this.scheduleNotes(notes, chords, totalTicks, startFromTick);

    // Start UI playhead tracking loop
    this.startPlayheadLoop(totalTicks);

    this.onPlaybackStateChange?.(true);
  }

  public pause(currentTick: number) {
    this.stopAudioNodesOnly();
    this.isPlaying = false;
    this.startTickOffset = currentTick;
    this.onPlaybackStateChange?.(false);
  }

  public stop() {
    this.stopAudioNodesOnly();
    this.isPlaying = false;
    this.startTickOffset = 0;
    this.onPlayheadUpdate?.(0);
    this.onPlaybackStateChange?.(false);
  }

  private stopAudioNodesOnly() {
    if (this.ctx) {
      const now = this.ctx.currentTime;
      for (const voice of this.activeVoices) {
        try {
          voice.stop(now);
        } catch {
          // Ignore
        }
      }
    }
    this.activeVoices = [];
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private scheduleNotes(notes: Note[], chords: Chord[], totalTicks: number, startTick: number) {
    if (!this.ctx) return;

    // Schedule up to 2 complete loops ahead
    const loopsToSchedule = this.isLooping ? 2 : 1;
    const loopDurationSec = this.ticksToSeconds(totalTicks);
    const startOffsetSec = this.ticksToSeconds(startTick);

    for (let loop = 0; loop < loopsToSchedule; loop++) {
      const loopStartAudioTime = this.startAudioTime + (loop * loopDurationSec) - startOffsetSec;

      // 1. Melody Notes
      if (!this.melodyMuted) {
        for (const note of notes) {
          if (loop === 0 && note.startTick < startTick) continue; // Skip notes before start position in first loop
          const noteStartAudio = loopStartAudioTime + this.ticksToSeconds(note.startTick);
          const durationSec = Math.max(0.08, this.ticksToSeconds(note.durationTicks));
          
          if (noteStartAudio >= this.startAudioTime - 0.05) {
            this.playInstrumentNote(
              note.midi,
              noteStartAudio,
              durationSec,
              note.velocity,
              this.melodyInstrument
            );
          }
        }
      }

      // 2. Chords
      if (!this.chordsMuted) {
        for (const chord of chords) {
          if (loop === 0 && chord.startTick + chord.durationTicks <= startTick) continue;
          const chordStartAudio = loopStartAudioTime + this.ticksToSeconds(chord.startTick);
          const chordDurationSec = this.ticksToSeconds(chord.durationTicks);

          if (chordStartAudio >= this.startAudioTime - 0.05) {
            for (const pitch of chord.voicingNotes) {
              this.playInstrumentNote(
                pitch,
                chordStartAudio,
                chordDurationSec * 0.95,
                75,
                this.chordInstrument
              );
            }
          }
        }
      }

      // 3. Metronome clicks
      if (this.metronomeEnabled) {
        const totalBeats = this.totalBars * 4;
        const beatTicks = TICKS_PER_QUARTER;
        for (let b = 0; b < totalBeats; b++) {
          const beatTick = b * beatTicks;
          if (loop === 0 && beatTick < startTick) continue;
          const clickTime = loopStartAudioTime + this.ticksToSeconds(beatTick);
          if (clickTime >= this.startAudioTime - 0.05) {
            const isDownbeat = (b % 4 === 0);
            this.playMetronomeClick(clickTime, isDownbeat);
          }
        }
      }
    }
  }

  private startPlayheadLoop(totalTicks: number) {
    const totalDurationSec = this.ticksToSeconds(totalTicks);

    const update = () => {
      if (!this.isPlaying || !this.ctx) return;

      const elapsed = this.ctx.currentTime - this.startAudioTime;
      const initialOffsetSec = this.ticksToSeconds(this.startTickOffset);
      const currentPosSec = initialOffsetSec + elapsed;

      let normalizedSec = currentPosSec;
      if (this.isLooping) {
        normalizedSec = currentPosSec % totalDurationSec;
      } else if (currentPosSec >= totalDurationSec) {
        this.stop();
        return;
      }

      const currentTick = this.secondsToTicks(normalizedSec);
      this.onPlayheadUpdate?.(currentTick);

      this.animationFrameId = requestAnimationFrame(update);
    };

    this.animationFrameId = requestAnimationFrame(update);
  }

  private playMetronomeClick(time: number, isDownbeat: boolean) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isDownbeat ? 1200 : 800, time);
    
    gain.gain.setValueAtTime(isDownbeat ? 0.35 : 0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.05);

    this.activeVoices.push({
      stop: (t) => {
        try { osc.stop(t); } catch {}
      }
    });
  }

  /**
   * Synthesize individual note with rich harmonic modeling and envelope
   */
  public playInstrumentNote(
    midi: number,
    time: number,
    durationSec: number,
    velocity: number = 100,
    instrument: InstrumentType = 'grand_piano'
  ) {
    if (!this.ctx || !this.dryGain) return;

    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const velFactor = (velocity / 127);

    switch (instrument) {
      case 'grand_piano':
        this.synthPiano(freq, time, durationSec, velFactor);
        break;
      case 'electric_piano':
        this.synthRhodes(freq, time, durationSec, velFactor);
        break;
      case 'synth_lead':
        this.synthLead(freq, time, durationSec, velFactor);
        break;
      case 'pluck':
        this.synthPluck(freq, time, durationSec, velFactor);
        break;
      case 'strings':
        this.synthStrings(freq, time, durationSec, velFactor);
        break;
      case 'warm_pad':
        this.synthPad(freq, time, durationSec, velFactor);
        break;
      case 'bass':
        this.synthBass(freq, time, durationSec, velFactor);
        break;
      default:
        this.synthPiano(freq, time, durationSec, velFactor);
    }
  }

  // --- Synthesis Presets ---

  // Grand Piano: 3 layered oscillators with decay and touch transient
  private synthPiano(freq: number, time: number, duration: number, vel: number) {
    if (!this.ctx || !this.dryGain) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, time);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, time); // 2nd harmonic
    osc2.detune.setValueAtTime(4, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(10000, freq * 6 * vel), time);
    filter.frequency.exponentialRampToValueAtTime(Math.max(200, freq * 1.5), time + duration);

    const peakGain = 0.5 * vel;
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(peakGain, time + 0.008); // Sharp hammer strike
    gain.gain.exponentialRampToValueAtTime(peakGain * 0.4, time + 0.15); // Initial decay
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration + 0.2); // Ring out

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.dryGain);
    if (this.reverbNode) gain.connect(this.reverbNode);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration + 0.25);
    osc2.stop(time + duration + 0.25);

    this.activeVoices.push({
      stop: (t) => {
        try { osc1.stop(t); osc2.stop(t); } catch {}
      }
    });
  }

  // Electric Piano (Rhodes): Sine + subtle bell overtone with tremolo
  private synthRhodes(freq: number, time: number, duration: number, vel: number) {
    if (!this.ctx || !this.dryGain) return;

    const oscFundamental = this.ctx.createOscillator();
    const oscTine = this.ctx.createOscillator();
    const tineGain = this.ctx.createGain();
    const mainGain = this.ctx.createGain();

    oscFundamental.type = 'sine';
    oscFundamental.frequency.setValueAtTime(freq, time);

    // High bell overtone at 4x or 5x
    oscTine.type = 'sine';
    oscTine.frequency.setValueAtTime(freq * 4, time);

    tineGain.gain.setValueAtTime(0.25 * vel, time);
    tineGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18); // Fast chime decay

    const peak = 0.45 * vel;
    mainGain.gain.setValueAtTime(0.001, time);
    mainGain.gain.linearRampToValueAtTime(peak, time + 0.012);
    mainGain.gain.exponentialRampToValueAtTime(0.0001, time + duration + 0.3);

    oscTine.connect(tineGain);
    tineGain.connect(mainGain);
    oscFundamental.connect(mainGain);

    mainGain.connect(this.dryGain);
    if (this.reverbNode) mainGain.connect(this.reverbNode);

    oscFundamental.start(time);
    oscTine.start(time);
    oscFundamental.stop(time + duration + 0.35);
    oscTine.stop(time + 0.2);

    this.activeVoices.push({
      stop: (t) => {
        try { oscFundamental.stop(t); oscTine.stop(t); } catch {}
      }
    });
  }

  // Synth Lead: Detuned Sawtooths with snappy lowpass filter
  private synthLead(freq: number, time: number, duration: number, vel: number) {
    if (!this.ctx || !this.dryGain) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);
    osc1.detune.setValueAtTime(-8, time);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq, time);
    osc2.detune.setValueAtTime(8, time);

    filter.type = 'lowpass';
    filter.Q.setValueAtTime(4.5, time);
    filter.frequency.setValueAtTime(freq * 1.5, time);
    filter.frequency.linearRampToValueAtTime(freq * 6 * vel, time + 0.05);
    filter.frequency.exponentialRampToValueAtTime(freq * 2, time + duration);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.35 * vel, time + 0.02);
    gain.gain.setValueAtTime(0.35 * vel, time + duration);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration + 0.1);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.dryGain);
    if (this.reverbNode) gain.connect(this.reverbNode);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration + 0.15);
    osc2.stop(time + duration + 0.15);

    this.activeVoices.push({
      stop: (t) => {
        try { osc1.stop(t); osc2.stop(t); } catch {}
      }
    });
  }

  // Pluck: Rapid exponential attack and quick damping
  private synthPluck(freq: number, time: number, duration: number, vel: number) {
    if (!this.ctx || !this.dryGain) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 8 * vel, time);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.2, time + 0.2);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.5 * vel, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + Math.min(duration, 0.45));

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.dryGain);
    if (this.reverbNode) gain.connect(this.reverbNode);

    osc.start(time);
    osc.stop(time + 0.5);

    this.activeVoices.push({
      stop: (t) => {
        try { osc.stop(t); } catch {}
      }
    });
  }

  // Strings: Slow swelling attack, warm chorus detuning
  private synthStrings(freq: number, time: number, duration: number, vel: number) {
    if (!this.ctx || !this.dryGain) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);
    osc1.detune.setValueAtTime(-10, time);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq, time);
    osc2.detune.setValueAtTime(10, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 3.5, time);

    const attackTime = Math.min(0.2, duration * 0.3);
    const peak = 0.28 * vel;
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(peak, time + attackTime);
    gain.gain.setValueAtTime(peak, time + duration);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration + 0.35);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.dryGain);
    if (this.reverbNode) gain.connect(this.reverbNode);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration + 0.4);
    osc2.stop(time + duration + 0.4);

    this.activeVoices.push({
      stop: (t) => {
        try { osc1.stop(t); osc2.stop(t); } catch {}
      }
    });
  }

  // Warm Pad: Filter sweep with lush stereo spread
  private synthPad(freq: number, time: number, duration: number, vel: number) {
    if (!this.ctx || !this.dryGain) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, time);
    osc1.detune.setValueAtTime(-6, time);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq, time);
    osc2.detune.setValueAtTime(6, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 1.5, time);
    filter.frequency.linearRampToValueAtTime(freq * 3, time + (duration * 0.5));
    filter.frequency.linearRampToValueAtTime(freq * 1.5, time + duration);

    const attack = Math.min(0.25, duration * 0.3);
    const peak = 0.22 * vel;
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(peak, time + attack);
    gain.gain.setValueAtTime(peak, time + duration);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration + 0.4);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.dryGain);
    if (this.reverbNode) gain.connect(this.reverbNode);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration + 0.45);
    osc2.stop(time + duration + 0.45);

    this.activeVoices.push({
      stop: (t) => {
        try { osc1.stop(t); osc2.stop(t); } catch {}
      }
    });
  }

  // Bass: Solid sub oscillator + punchy saw
  private synthBass(freq: number, time: number, duration: number, vel: number) {
    if (!this.ctx || !this.dryGain) return;

    const oscSub = this.ctx.createOscillator();
    const oscHarmonic = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    oscSub.type = 'sine';
    oscSub.frequency.setValueAtTime(freq, time);

    oscHarmonic.type = 'triangle';
    oscHarmonic.frequency.setValueAtTime(freq * 2, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(800, freq * 4), time);

    const peak = 0.5 * vel;
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(peak * 0.6, time + 0.2);
    gain.gain.setValueAtTime(peak * 0.6, time + duration);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration + 0.1);

    oscSub.connect(filter);
    oscHarmonic.connect(filter);
    filter.connect(gain);
    gain.connect(this.dryGain);

    oscSub.start(time);
    oscHarmonic.start(time);
    oscSub.stop(time + duration + 0.15);
    oscHarmonic.stop(time + duration + 0.15);

    this.activeVoices.push({
      stop: (t) => {
        try { oscSub.stop(t); oscHarmonic.stop(t); } catch {}
      }
    });
  }
}

// Global shared singleton
export const audioEngine = new AudioEngine();
