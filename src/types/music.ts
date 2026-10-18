/**
 * Core musical types and data structures for ChordMood
 */

export interface Note {
  id: string;
  midi: number;         // 0 - 127 (e.g. 60 = Middle C / C4)
  startTick: number;    // Absolute start tick
  durationTicks: number;// Length in ticks
  velocity: number;     // 1 - 127 (standard MIDI velocity)
  selected?: boolean;
}

export interface Chord {
  id: string;
  root: string;         // 'C', 'G#', etc.
  type: string;         // 'major', 'minor', '7', 'maj7', 'min7', 'dim', 'aug', 'sus4', 'add9'
  symbol: string;       // e.g. 'Am7', 'G7', 'Cmaj7'
  romanNumeral: string; // e.g. 'i7', 'V7', 'Imaj7'
  startTick: number;
  durationTicks: number;
  voicingNotes: number[]; // MIDI pitches representing the chord voicing
}

export type Genre =
  | 'Funk'
  | 'Classical'
  | 'Jazz'
  | 'EDM'
  | 'Pop'
  | 'Hip-Hop'
  | 'Lo-fi'
  | 'Ambient'
  | 'Cinematic'
  | 'Medieval'
  | 'Dark Fantasy'
  | 'Custom';

export type ScaleType =
  | 'major'
  | 'natural_minor'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'harmonic_minor'
  | 'melodic_minor';

export type MusicalKey =
  | 'C'
  | 'C#'
  | 'D'
  | 'D#'
  | 'E'
  | 'F'
  | 'F#'
  | 'G'
  | 'G#'
  | 'A'
  | 'A#'
  | 'B';

export type MoodPreset =
  | 'Happy'
  | 'Sad'
  | 'Mysterious'
  | 'Dark'
  | 'Epic'
  | 'Romantic'
  | 'Dreamy'
  | 'Aggressive'
  | 'Nostalgic'
  | 'Medieval'
  | 'Hopeful';

export interface MoodDimensions {
  valence: number;    // -100 (Sad) to +100 (Happy)
  energy: number;     // -100 (Calm) to +100 (Energetic)
  brightness: number; // -100 (Dark) to +100 (Bright)
  tension: number;    // -100 (Stable) to +100 (Tense)
  complexity: number; // -100 (Simple) to +100 (Complex)
}

export interface GenerationSettings {
  melodicComplexity: number;  // 0 - 100
  rhythmicComplexity: number; // 0 - 100
  noteDensity: number;        // 0 - 100
  repetitionAmount: number;   // 0 - 100
  minPitch: number;           // MIDI note, e.g. 48 (C3)
  maxPitch: number;           // MIDI note, e.g. 84 (C6)
  maxLeap: number;            // Max interval in semitones (e.g. 4, 7, 12)
  syncopationAmount: number;  // 0 - 100
  phraseLengthBars: number;   // 1, 2, or 4
  rhythmicVariation: number;  // 0 - 100
  tension: number;            // 0 - 100
  resolutionStrength: number; // 0 - 100
  seed: number;               // Seed for deterministic generation
}

export type PianoRollTool = 'draw' | 'select' | 'paint' | 'delete';

export type SnapOption =
  | '1_bar'
  | '1_2_bar'
  | '1_4'     // quarter
  | '1_8'     // eighth
  | '1_16'    // sixteenth
  | '1_32'    // thirty-second
  | '1_8T'    // eighth triplet
  | '1_16T'   // sixteenth triplet
  | 'off';

export interface ChordSuggestion {
  id: string;
  name: string;
  description: string;
  score: number; // 0 - 100 heuristic compatibility
  progression: Chord[];
  harmonicCharacter: string;
}

export type InstrumentType =
  | 'grand_piano'
  | 'electric_piano'
  | 'synth_lead'
  | 'pluck'
  | 'strings'
  | 'warm_pad'
  | 'bass';

export interface TimeSignature {
  numerator: number;
  denominator: number;
}

export const TICKS_PER_QUARTER = 960;
