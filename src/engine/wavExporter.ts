/**
 * WAV Audio Renderer & Exporter:
 * Offline Web Audio API rendering and 16-bit PCM RIFF WAV binary encoder.
 */

import { Note, Chord, InstrumentType, TICKS_PER_QUARTER } from '../types/music';

export interface WavExportOptions {
  mode: 'full' | 'melody' | 'chords';
  sampleRate: 44100 | 48000;
  filename?: string;
  melodyInstrument: InstrumentType;
  chordInstrument: InstrumentType;
}

export async function renderCompositionToWav(
  notes: Note[],
  chords: Chord[],
  bars: number,
  bpm: number,
  options: WavExportOptions
): Promise<Blob> {
  const sampleRate = options.sampleRate || 44100;
  const beatsPerBar = 4;
  const totalTicks = bars * beatsPerBar * TICKS_PER_QUARTER;
  const totalDurationSec = ((totalTicks / TICKS_PER_QUARTER) * 60) / bpm + 1.5; // + 1.5s reverb tail

  const OfflineContextClass = window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  const offlineCtx = new OfflineContextClass(2, Math.ceil(sampleRate * totalDurationSec), sampleRate);

  // Master bus
  const masterGain = offlineCtx.createGain();
  masterGain.gain.setValueAtTime(0.85, 0);

  // Reverb bus
  const reverbNode = offlineCtx.createConvolver();
  const reverbGain = offlineCtx.createGain();
  reverbGain.gain.setValueAtTime(0.28, 0);

  const dryGain = offlineCtx.createGain();
  dryGain.gain.setValueAtTime(0.85, 0);

  // Create impulse response
  const impulseLen = Math.floor(sampleRate * 1.5);
  const impulseBuffer = offlineCtx.createBuffer(2, impulseLen, sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = impulseBuffer.getChannelData(c);
    for (let i = 0; i < impulseLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impulseLen, 2.0);
    }
  }
  reverbNode.buffer = impulseBuffer;

  dryGain.connect(masterGain);
  reverbNode.connect(reverbGain);
  reverbGain.connect(masterGain);
  masterGain.connect(offlineCtx.destination);

  const ticksToSec = (t: number) => ((t / TICKS_PER_QUARTER) * 60) / bpm;

  // Render melody notes
  if (options.mode === 'full' || options.mode === 'melody') {
    for (const note of notes) {
      const startTime = ticksToSec(note.startTick);
      const duration = Math.max(0.08, ticksToSec(note.durationTicks));
      scheduleVoice(offlineCtx, dryGain, reverbNode, note.midi, startTime, duration, note.velocity / 127, options.melodyInstrument);
    }
  }

  // Render chords
  if (options.mode === 'full' || options.mode === 'chords') {
    for (const chord of chords) {
      const startTime = ticksToSec(chord.startTick);
      const duration = ticksToSec(chord.durationTicks);
      for (const pitch of chord.voicingNotes) {
        scheduleVoice(offlineCtx, dryGain, reverbNode, pitch, startTime, duration * 0.95, 0.65, options.chordInstrument);
      }
    }
  }

  // Render audio offline
  const renderedBuffer = await offlineCtx.startRendering();

  // Encode to 16-bit PCM RIFF WAV
  const wavBytes = encodeWav(renderedBuffer);
  return new Blob([wavBytes.buffer as ArrayBuffer], { type: 'audio/wav' });
}

function scheduleVoice(
  ctx: BaseAudioContext,
  dryBus: GainNode,
  reverbBus: ConvolverNode,
  midi: number,
  time: number,
  duration: number,
  vel: number,
  instrument: InstrumentType
) {
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  if (instrument === 'grand_piano') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(10000, freq * 5 * vel), time);
    filter.frequency.exponentialRampToValueAtTime(Math.max(200, freq * 1.5), time + duration);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.5 * vel, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.18 * vel, time + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration + 0.2);
  } else if (instrument === 'electric_piano') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 4, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.45 * vel, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration + 0.3);
  } else if (instrument === 'synth_lead') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 6 * vel, time);
    filter.frequency.exponentialRampToValueAtTime(freq * 2, time + duration);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.35 * vel, time + 0.02);
    gain.gain.setValueAtTime(0.35 * vel, time + duration);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration + 0.1);
  } else if (instrument === 'pluck') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 8 * vel, time);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.2, time + 0.2);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.5 * vel, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + Math.min(duration, 0.45));
  } else { // warm_pad, strings, bass
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 2.5, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.3 * vel, time + 0.08);
    gain.gain.setValueAtTime(0.3 * vel, time + duration);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration + 0.35);
  }

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(dryBus);
  gain.connect(reverbBus);

  osc.start(time);
  osc.stop(time + duration + 0.4);
}

/**
 * Encodes an AudioBuffer into 16-bit PCM stereo WAV bytes
 */
export function encodeWav(buffer: AudioBuffer): Uint8Array {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numSamples = buffer.length;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const bufferLength = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  // Write ASCII string helper
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // 1. RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // Total file size - 8
  writeString(8, 'WAVE');

  // 2. fmt subchunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);             // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);              // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);    // NumChannels
  view.setUint32(24, sampleRate, true);     // SampleRate
  view.setUint32(28, byteRate, true);       // ByteRate
  view.setUint16(32, blockAlign, true);     // BlockAlign
  view.setUint16(34, 16, true);             // BitsPerSample (16 bits)

  // 3. data subchunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Write interleaved 16-bit PCM audio samples
  const left = buffer.getChannelData(0);
  const right = numChannels > 1 ? buffer.getChannelData(1) : left;

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    // Clamp to [-1, 1] and scale to 16-bit signed integer [-32768, 32767]
    const sampleL = Math.max(-1, Math.min(1, left[i]));
    const intL = sampleL < 0 ? sampleL * 0x8000 : sampleL * 0x7fff;
    view.setInt16(offset, intL, true);
    offset += 2;

    if (numChannels > 1) {
      const sampleR = Math.max(-1, Math.min(1, right[i]));
      const intR = sampleR < 0 ? sampleR * 0x8000 : sampleR * 0x7fff;
      view.setInt16(offset, intR, true);
      offset += 2;
    }
  }

  return new Uint8Array(arrayBuffer);
}

export async function downloadWavFile(
  notes: Note[],
  chords: Chord[],
  bars: number,
  bpm: number,
  options: WavExportOptions
) {
  const blob = await renderCompositionToWav(notes, chords, bars, bpm, options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = options.filename || `chordmood_export_${options.mode}.wav`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
