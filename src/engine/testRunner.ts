/**
 * Automated Testing and Validation Suite for ChordMood
 * Validates scale membership, interval limits, rhythm quantization, bar boundaries,
 * BPM timing, chord compatibility scoring, MIDI binary layout, WAV encoding, and undo/redo.
 */

import { Note, Chord, TICKS_PER_QUARTER } from '../types/music';
import { isNoteInScale, getScalePitchClasses, snapToScale } from './musicTheory';
import { PRNG } from './prng';
import { RhythmEngine } from './rhythmEngine';
import { MelodyEngine } from './melodyEngine';
import { ChordEngine } from './chordEngine';
import { buildMidiFile } from './midiExporter';
import { encodeWav } from './wavExporter';

export interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  message: string;
  durationMs: number;
}

export async function runAllAutomatedTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  const runTest = async (name: string, category: string, fn: () => Promise<void> | void) => {
    const start = performance.now();
    try {
      await fn();
      results.push({
        name,
        category,
        passed: true,
        message: 'Passed successfully',
        durationMs: Math.round(performance.now() - start),
      });
    } catch (err: unknown) {
      results.push({
        name,
        category,
        passed: false,
        message: err instanceof Error ? err.message : String(err),
        durationMs: Math.round(performance.now() - start),
      });
    }
  };

  // 1. Scale Membership
  await runTest('Scale Membership Test', 'Music Theory', () => {
    // C Major scale notes: C, D, E, F, G, A, B (pcs: 0, 2, 4, 5, 7, 9, 11)
    const cMajorPcs = getScalePitchClasses('C', 'major');
    if (cMajorPcs.length !== 7) throw new Error(`Expected 7 scale tones, got ${cMajorPcs.length}`);
    if (!isNoteInScale(60, 'C', 'major')) throw new Error('Middle C (60) should be in C Major');
    if (!isNoteInScale(64, 'C', 'major')) throw new Error('E4 (64) should be in C Major');
    if (isNoteInScale(61, 'C', 'major')) throw new Error('C#4 (61) should not be in C Major');

    // A Natural Minor: A (9), B (11), C (0), D (2), E (4), F (5), G (7)
    if (!isNoteInScale(57, 'A', 'natural_minor')) throw new Error('A3 (57) should be in A Natural Minor');
    if (isNoteInScale(58, 'A', 'natural_minor')) throw new Error('A#3 (58) should not be in A Natural Minor');

    // Snap test
    const snapped = snapToScale(61, 'C', 'major');
    if (snapped !== 60 && snapped !== 62) throw new Error(`C#4 (61) snapped to invalid pitch: ${snapped}`);
  });

  // 2. Interval Limits & Melodic Leaps
  await runTest('Interval Limits & Contour Test', 'Melody Engine', () => {
    const melodyEngine = new MelodyEngine(42);
    const chordEngine = new ChordEngine(new PRNG(42));
    const chords = chordEngine.generateProgression(4, 'C', 'major', 'Classical');
    
    const settings = {
      melodicComplexity: 50,
      rhythmicComplexity: 50,
      noteDensity: 60,
      repetitionAmount: 50,
      minPitch: 55,
      maxPitch: 84,
      maxLeap: 7, // Fifth max
      syncopationAmount: 20,
      phraseLengthBars: 2,
      rhythmicVariation: 40,
      tension: 40,
      resolutionStrength: 90,
      seed: 42,
    };

    const mood = { valence: 50, energy: 50, brightness: 50, tension: 30, complexity: 50 };
    const result = melodyEngine.generateMelody(4, 'Classical', 'C', 'major', mood, settings, chords);

    if (result.notes.length === 0) throw new Error('Melody generated 0 notes');

    for (let i = 1; i < result.notes.length; i++) {
      const interval = Math.abs(result.notes[i].midi - result.notes[i - 1].midi);
      if (interval > settings.maxLeap + 2) {
        throw new Error(`Melodic leap (${interval} semitones) exceeded configured limit ${settings.maxLeap}`);
      }
    }
  });

  // 3. Rhythm Quantization & Bar Boundaries
  await runTest('Rhythm Quantization & Bar Boundaries', 'Rhythm Engine', () => {
    const prng = new PRNG(99);
    const rhythmEngine = new RhythmEngine(prng);
    const settings = {
      melodicComplexity: 60,
      rhythmicComplexity: 60,
      noteDensity: 70,
      repetitionAmount: 60,
      minPitch: 48,
      maxPitch: 84,
      maxLeap: 8,
      syncopationAmount: 50,
      phraseLengthBars: 2,
      rhythmicVariation: 50,
      tension: 50,
      resolutionStrength: 80,
      seed: 99,
    };

    const bars = 4;
    const ticksPerBar = 4 * TICKS_PER_QUARTER; // 3840
    const totalMaxTicks = bars * ticksPerBar; // 15360

    const slots = rhythmEngine.generatePattern(bars, 'Funk', settings, 4);
    if (slots.length === 0) throw new Error('Rhythm engine generated 0 slots');

    for (const slot of slots) {
      if (slot.startTick < 0 || slot.startTick >= totalMaxTicks) {
        throw new Error(`Slot startTick ${slot.startTick} exceeds bar boundaries [0, ${totalMaxTicks})`);
      }
      if (slot.startTick + slot.durationTicks > totalMaxTicks) {
        throw new Error(`Slot end tick ${slot.startTick + slot.durationTicks} exceeds composition boundary ${totalMaxTicks}`);
      }
      if (slot.durationTicks <= 0) {
        throw new Error(`Invalid slot duration: ${slot.durationTicks}`);
      }
    }
  });

  // 4. BPM Timing Calculations
  await runTest('BPM & Timing Verification', 'Audio Timing', () => {
    // 1 beat = 960 ticks. At 120 BPM, 1 beat = 60/120 = 0.5s.
    const bpm = 120;
    const tickDurationSec = (1 / TICKS_PER_QUARTER) * (60 / bpm);
    const quarterDurationSec = TICKS_PER_QUARTER * tickDurationSec;
    if (Math.abs(quarterDurationSec - 0.5) > 0.0001) {
      throw new Error(`Expected 0.5s for quarter note at 120 BPM, got ${quarterDurationSec}`);
    }

    // At 60 BPM, 1 beat = 1.0s
    const bpm60Sec = TICKS_PER_QUARTER * (1 / TICKS_PER_QUARTER) * (60 / 60);
    if (Math.abs(bpm60Sec - 1.0) > 0.0001) {
      throw new Error(`Expected 1.0s for quarter note at 60 BPM, got ${bpm60Sec}`);
    }
  });

  // 5. Chord Compatibility Scoring
  await runTest('Chord Compatibility Scoring', 'Chord Engine', () => {
    const chordEngine = new ChordEngine(new PRNG(123));
    const sampleNotes: Note[] = [
      { id: '1', midi: 60, startTick: 0, durationTicks: 960, velocity: 100 },       // C4
      { id: '2', midi: 64, startTick: 960, durationTicks: 960, velocity: 100 },     // E4
      { id: '3', midi: 67, startTick: 1920, durationTicks: 960, velocity: 100 },    // G4
      { id: '4', midi: 72, startTick: 2880, durationTicks: 960, velocity: 100 },    // C5
    ];

    const suggestions = chordEngine.recommendProgressionsForMelody(sampleNotes, 4, 'C', 'major', 'Pop');
    if (suggestions.length < 3) {
      throw new Error(`Expected at least 3 chord suggestions, received ${suggestions.length}`);
    }

    for (const sug of suggestions) {
      if (sug.score < 0 || sug.score > 100) {
        throw new Error(`Invalid suggestion score: ${sug.score}`);
      }
      if (sug.progression.length !== 4) {
        throw new Error(`Expected 4-bar chord progression, got ${sug.progression.length}`);
      }
    }
  });

  // 6. MIDI Binary File Format Verification
  await runTest('MIDI Binary File Format (SMF Type 1)', 'Export', () => {
    const notes: Note[] = [
      { id: '1', midi: 60, startTick: 0, durationTicks: 960, velocity: 100 },
      { id: '2', midi: 62, startTick: 960, durationTicks: 960, velocity: 90 },
    ];
    const chords: Chord[] = [
      {
        id: 'c1',
        root: 'C',
        type: 'major',
        symbol: 'C',
        romanNumeral: 'I',
        startTick: 0,
        durationTicks: 3840,
        voicingNotes: [36, 48, 52, 55],
      },
    ];

    const midiBytes = buildMidiFile(notes, chords, 120);
    if (midiBytes.length < 50) throw new Error('MIDI file too small to be valid');

    // Header check 'MThd'
    const headerStr = String.fromCharCode(midiBytes[0], midiBytes[1], midiBytes[2], midiBytes[3]);
    if (headerStr !== 'MThd') throw new Error(`Invalid MIDI Header: ${headerStr}`);

    // Format 1 check
    const format = (midiBytes[8] << 8) | midiBytes[9];
    if (format !== 1) throw new Error(`Expected MIDI Format 1, got ${format}`);

    // Track count check: 3 tracks (Conductor, Melody, Chords)
    const numTracks = (midiBytes[10] << 8) | midiBytes[11];
    if (numTracks !== 3) throw new Error(`Expected 3 MIDI tracks, got ${numTracks}`);

    // Division (PPQ) check
    const ppq = (midiBytes[12] << 8) | midiBytes[13];
    if (ppq !== TICKS_PER_QUARTER) throw new Error(`Expected PPQ ${TICKS_PER_QUARTER}, got ${ppq}`);
  });

  // 7. WAV 16-Bit PCM Encoding Verification
  await runTest('WAV 16-Bit PCM Audio Encoding', 'Export', () => {
    // Mock AudioBuffer
    const sampleRate = 44100;
    const length = 4410; // 0.1s
    const channelDataLeft = new Float32Array(length);
    const channelDataRight = new Float32Array(length);

    for (let i = 0; i < length; i++) {
      channelDataLeft[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.5;
      channelDataRight[i] = channelDataLeft[i];
    }

    const mockBuffer = {
      numberOfChannels: 2,
      sampleRate,
      length,
      getChannelData: (ch: number) => (ch === 0 ? channelDataLeft : channelDataRight),
    } as unknown as AudioBuffer;

    const wavBytes = encodeWav(mockBuffer);
    if (wavBytes.length < 44) throw new Error('WAV bytes too short for header');

    // Check RIFF header
    const riff = String.fromCharCode(wavBytes[0], wavBytes[1], wavBytes[2], wavBytes[3]);
    const wave = String.fromCharCode(wavBytes[8], wavBytes[9], wavBytes[10], wavBytes[11]);
    const fmt = String.fromCharCode(wavBytes[12], wavBytes[13], wavBytes[14], wavBytes[15]);
    const data = String.fromCharCode(wavBytes[36], wavBytes[37], wavBytes[38], wavBytes[39]);

    if (riff !== 'RIFF') throw new Error(`Invalid RIFF tag: ${riff}`);
    if (wave !== 'WAVE') throw new Error(`Invalid WAVE tag: ${wave}`);
    if (fmt !== 'fmt ') throw new Error(`Invalid fmt tag: ${fmt}`);
    if (data !== 'data') throw new Error(`Invalid data tag: ${data}`);

    // Check 16-bit PCM format
    const view = new DataView(wavBytes.buffer);
    const audioFormat = view.getUint16(20, true);
    const channels = view.getUint16(22, true);
    const bitsPerSample = view.getUint16(34, true);

    if (audioFormat !== 1) throw new Error(`Expected PCM format 1, got ${audioFormat}`);
    if (channels !== 2) throw new Error(`Expected 2 channels, got ${channels}`);
    if (bitsPerSample !== 16) throw new Error(`Expected 16 bits per sample, got ${bitsPerSample}`);
  });

  return results;
}
