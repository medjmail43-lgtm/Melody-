/**
 * Music Theory Engine: Keys, Scales, Intervals, Chords, and Voicing
 */

import { MusicalKey, ScaleType } from '../types/music';

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export const SCALE_INTERVALS: Record<ScaleType, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  natural_minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
  melodic_minor: [0, 2, 3, 5, 7, 9, 11],
};

export const SCALE_NAMES: Record<ScaleType, string> = {
  major: 'Major (Ionian)',
  natural_minor: 'Natural Minor (Aeolian)',
  dorian: 'Dorian',
  phrygian: 'Phrygian',
  lydian: 'Lydian',
  mixolydian: 'Mixolydian',
  harmonic_minor: 'Harmonic Minor',
  melodic_minor: 'Melodic Minor',
};

// Convert MIDI note number (0 - 127) to name (e.g. 60 -> "C4")
export function midiToNoteName(midi: number): string {
  const noteIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

// Convert Note name and octave to MIDI (e.g. "C", 4 -> 60)
export function noteNameToMidi(name: string, octave: number): number {
  const cleanName = name.trim().toUpperCase();
  const index = NOTE_NAMES.indexOf(cleanName as (typeof NOTE_NAMES)[number]);
  if (index === -1) return 60;
  return (octave + 1) * 12 + index;
}

// Get root note chromatic pitch class (0 for C, 1 for C#, etc.)
export function getPitchClass(noteName: string): number {
  const index = NOTE_NAMES.indexOf(noteName as (typeof NOTE_NAMES)[number]);
  return index >= 0 ? index : 0;
}

// Return all pitch classes in scale (0 to 11)
export function getScalePitchClasses(key: MusicalKey, scale: ScaleType): number[] {
  const rootPc = getPitchClass(key);
  const intervals = SCALE_INTERVALS[scale] || SCALE_INTERVALS.major;
  return intervals.map(interval => (rootPc + interval) % 12);
}

// Check if a MIDI note is inside the chosen key & scale
export function isNoteInScale(midi: number, key: MusicalKey, scale: ScaleType): boolean {
  const pc = ((midi % 12) + 12) % 12;
  const scalePcs = getScalePitchClasses(key, scale);
  return scalePcs.includes(pc);
}

// Snap a given MIDI note to the nearest pitch inside the scale
export function snapToScale(midi: number, key: MusicalKey, scale: ScaleType): number {
  if (isNoteInScale(midi, key, scale)) return midi;
  const scalePcs = getScalePitchClasses(key, scale);
  
  let bestPitch = midi;
  let minDiff = 999;
  
  // Test +/- 1 and 2 semitones
  for (let offset = -2; offset <= 2; offset++) {
    const candidate = midi + offset;
    const pc = ((candidate % 12) + 12) % 12;
    if (scalePcs.includes(pc)) {
      const diff = Math.abs(offset);
      if (diff < minDiff) {
        minDiff = diff;
        bestPitch = candidate;
      }
    }
  }
  return bestPitch;
}

// Get all MIDI notes within a range [minMidi, maxMidi] that belong to the scale
export function getScaleNotesInRange(
  key: MusicalKey,
  scale: ScaleType,
  minMidi: number = 36,
  maxMidi: number = 84
): number[] {
  const scalePcs = getScalePitchClasses(key, scale);
  const notes: number[] = [];
  for (let m = minMidi; m <= maxMidi; m++) {
    const pc = ((m % 12) + 12) % 12;
    if (scalePcs.includes(pc)) {
      notes.push(m);
    }
  }
  return notes;
}

// Chord formulas relative to chord root in semitones
export const CHORD_INTERVALS: Record<string, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  half_dim7: [0, 3, 6, 10],
  aug: [0, 4, 8],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7],
  add9: [0, 4, 7, 14],
  '9': [0, 4, 7, 10, 14],
  min9: [0, 3, 7, 10, 14],
};

// Generate polyphonic MIDI notes for a chord voicing around octave 3-4 with a solid bass note in octave 2
export function getChordVoicing(rootNote: string, chordType: string, baseOctave = 3): number[] {
  const rootPc = getPitchClass(rootNote);
  const intervals = CHORD_INTERVALS[chordType] || [0, 4, 7];
  
  // Bass root note in octave 2 (e.g. C2 = 36)
  const bassMidi = (2 + 1) * 12 + rootPc;
  
  // Upper voicing in baseOctave (typically 3 or 4)
  const upperMidis = intervals.map(inter => {
    return (baseOctave + 1) * 12 + rootPc + inter;
  });

  return [bassMidi, ...upperMidis];
}

// Roman numeral analysis helper
export function getRomanNumeral(rootNote: string, chordType: string, key: MusicalKey, scale: ScaleType): string {
  const rootPc = getPitchClass(rootNote);
  const keyPc = getPitchClass(key);
  const scaleIntervals = SCALE_INTERVALS[scale] || SCALE_INTERVALS.major;
  
  // Degree in scale
  const semitonesFromKey = ((rootPc - keyPc) % 12 + 12) % 12;
  const degreeIndex = scaleIntervals.indexOf(semitonesFromKey);
  
  const numeralsMajor = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const numeralsMinor = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'];
  
  const isMinorChord = chordType.includes('minor') || chordType.includes('min') || chordType === 'dim';
  const baseList = isMinorChord ? numeralsMinor : numeralsMajor;
  
  let numeral = degreeIndex >= 0 ? baseList[degreeIndex] : `b${numeralsMajor[degreeIndex % 7] || 'I'}`;
  if (chordType === 'dim') numeral += '°';
  if (chordType === 'dim7') numeral += '°7';
  if (chordType === 'half_dim7') numeral += 'ø7';
  if (chordType === '7') numeral += '7';
  if (chordType === 'maj7') numeral += 'maj7';
  if (chordType === 'min7') numeral += '7';
  if (chordType === 'sus4') numeral += 'sus4';
  if (chordType === 'add9') numeral += '(add9)';
  
  return numeral;
}
