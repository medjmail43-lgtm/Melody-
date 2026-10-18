/**
 * Chord Engine: Progression generation, melody harmonization, and recommendation
 */

import { Chord, ChordSuggestion, Genre, MusicalKey, ScaleType, MoodDimensions, TICKS_PER_QUARTER, Note } from '../types/music';
import { NOTE_NAMES, getPitchClass, getChordVoicing, getRomanNumeral, isNoteInScale, CHORD_INTERVALS } from './musicTheory';
import { PRNG } from './prng';

// Convert a Roman numeral template like "vi" or "V7" into a specific chord in key
export function romanToChord(
  numeral: string,
  key: MusicalKey,
  scale: ScaleType,
  startTick: number,
  durationTicks: number
): Chord {
  const rootPc = getPitchClass(key);
  
  // Standard diatonic scale intervals
  const isMinorScale = scale.includes('minor') || scale === 'phrygian' || scale === 'dorian';
  
  // Map Roman numerals to semitone offset and chord quality
  const mapping: Record<string, { semitones: number; type: string; symbolSuffix: string }> = {
    'I': { semitones: 0, type: 'major', symbolSuffix: '' },
    'i': { semitones: 0, type: 'minor', symbolSuffix: 'm' },
    'Imaj7': { semitones: 0, type: 'maj7', symbolSuffix: 'maj7' },
    'i7': { semitones: 0, type: 'min7', symbolSuffix: 'm7' },
    'i9': { semitones: 0, type: 'min9', symbolSuffix: 'm9' },
    'bII': { semitones: 1, type: 'major', symbolSuffix: '' },
    'ii': { semitones: 2, type: 'minor', symbolSuffix: 'm' },
    'ii°': { semitones: 2, type: 'dim', symbolSuffix: 'dim' },
    'ii7': { semitones: 2, type: 'min7', symbolSuffix: 'm7' },
    'bIII': { semitones: 3, type: 'major', symbolSuffix: '' },
    'bIIImaj7': { semitones: 3, type: 'maj7', symbolSuffix: 'maj7' },
    'iii': { semitones: 4, type: 'minor', symbolSuffix: 'm' },
    'iii7': { semitones: 4, type: 'min7', symbolSuffix: 'm7' },
    'IV': { semitones: 5, type: 'major', symbolSuffix: '' },
    'iv': { semitones: 5, type: 'minor', symbolSuffix: 'm' },
    'IVmaj7': { semitones: 5, type: 'maj7', symbolSuffix: 'maj7' },
    'IV7': { semitones: 5, type: '7', symbolSuffix: '7' },
    'iv7': { semitones: 5, type: 'min7', symbolSuffix: 'm7' },
    'V': { semitones: 7, type: 'major', symbolSuffix: '' },
    'v': { semitones: 7, type: 'minor', symbolSuffix: 'm' },
    'V7': { semitones: 7, type: '7', symbolSuffix: '7' },
    'bVI': { semitones: 8, type: 'major', symbolSuffix: '' },
    'vi': { semitones: 9, type: 'minor', symbolSuffix: 'm' },
    'vi7': { semitones: 9, type: 'min7', symbolSuffix: 'm7' },
    'VI7': { semitones: 9, type: '7', symbolSuffix: '7' },
    'bVII': { semitones: 10, type: 'major', symbolSuffix: '' },
    'bVII7': { semitones: 10, type: '7', symbolSuffix: '7' },
    'vii°': { semitones: 11, type: 'dim', symbolSuffix: 'dim' },
  };

  const info = mapping[numeral] || (isMinorScale ? mapping['i'] : mapping['I']);
  const chordRootPc = (rootPc + info.semitones) % 12;
  const chordRootName = NOTE_NAMES[chordRootPc];
  const symbol = `${chordRootName}${info.symbolSuffix}`;
  
  const voicing = getChordVoicing(chordRootName, info.type, 3);

  return {
    id: `chord-${startTick}-${chordRootName}-${Math.random().toString(36).substr(2, 5)}`,
    root: chordRootName,
    type: info.type,
    symbol,
    romanNumeral: numeral,
    startTick,
    durationTicks,
    voicingNotes: voicing,
  };
}

export class ChordEngine {
  private prng: PRNG;

  constructor(prng: PRNG) {
    this.prng = prng;
  }

  /**
   * Generate default chord progression matching key, scale, bars, and genre
   */
  generateProgression(
    bars: number,
    key: MusicalKey,
    scale: ScaleType,
    genre: Genre,
    beatsPerBar: number = 4
  ): Chord[] {
    const ticksPerBar = beatsPerBar * TICKS_PER_QUARTER;
    const isMinor = scale.includes('minor') || scale === 'phrygian' || scale === 'dorian';

    // Curated standard templates per scale & genre
    const majorTemplates = [
      ['I', 'V', 'vi', 'IV'],
      ['I', 'IV', 'V', 'I'],
      ['I', 'vi', 'IV', 'V'],
      ['Imaj7', 'vi7', 'ii7', 'V7'],
      ['IVmaj7', 'I', 'V', 'vi'],
    ];

    const minorTemplates = [
      ['i', 'bVI', 'bIII', 'bVII'],
      ['i', 'iv', 'V7', 'i'],
      ['i7', 'iv7', 'bVII', 'bIIImaj7'],
      ['i', 'bVII', 'bVI', 'V7'],
      ['i', 'bVI', 'iv', 'V7'],
    ];

    const modalTemplates = [
      ['i7', 'IV7', 'i7', 'IV7'], // Dorian funk
      ['i', 'bII', 'i', 'bII'],   // Phrygian
      ['Imaj7', 'II7', 'Imaj7', 'II7'], // Lydian
      ['I', 'bVII', 'IV', 'I'],   // Mixolydian
    ];

    let templates = isMinor ? minorTemplates : majorTemplates;
    if (scale === 'dorian' || scale === 'phrygian' || scale === 'lydian' || scale === 'mixolydian') {
      templates = [...modalTemplates, ...templates];
    }

    const template = this.prng.choice(templates);
    const chords: Chord[] = [];

    for (let bar = 0; bar < bars; bar++) {
      const numeral = template[bar % template.length];
      const startTick = bar * ticksPerBar;
      const durationTicks = ticksPerBar;
      chords.push(romanToChord(numeral, key, scale, startTick, durationTicks));
    }

    return chords;
  }

  /**
   * Recommend 3 - 4 alternative progressions based on an existing melody
   */
  recommendProgressionsForMelody(
    melodyNotes: Note[],
    bars: number,
    key: MusicalKey,
    scale: ScaleType,
    genre: Genre,
    beatsPerBar: number = 4
  ): ChordSuggestion[] {
    const isMinor = scale.includes('minor') || scale === 'phrygian' || scale === 'dorian';

    const candidateTemplates: { name: string; description: string; harmonicCharacter: string; template: string[] }[] = isMinor
      ? [
          {
            name: 'Emotional Minor Epic',
            description: 'Powerful, soaring progression with deep emotional gravitas.',
            harmonicCharacter: 'i – ♭VI – ♭III – ♭VII (Natural Minor Anthem)',
            template: ['i', 'bVI', 'bIII', 'bVII'],
          },
          {
            name: 'Classical Cadence',
            description: 'Dramatic harmonic minor movement with strong leading-tone resolution.',
            harmonicCharacter: 'i – iv – V7 – i (Authentic Harmonic Cadence)',
            template: ['i', 'iv', 'V7', 'i'],
          },
          {
            name: 'Soulful Modal Groove',
            description: 'Lush Dorian/Jazz progression with rich seventh colorations.',
            harmonicCharacter: 'i7 – iv7 – ♭VII – ♭IIImaj7 (Smooth Modal Flow)',
            template: ['i7', 'iv7', 'bVII', 'bIIImaj7'],
          },
          {
            name: 'Dark Tension Andalusian',
            description: 'Descending bassline creating brooding mystery and dramatic tension.',
            harmonicCharacter: 'i – ♭VII – ♭VI – V7 (Flamenco / Dark Fantasy Descent)',
            template: ['i', 'bVII', 'bVI', 'V7'],
          },
        ]
      : [
          {
            name: 'Modern Pop Classic',
            description: 'The definitive anthem progression; uplifting, memorable, and balanced.',
            harmonicCharacter: 'I – V – vi – IV (Axis of Awesome Progression)',
            template: ['I', 'V', 'vi', 'IV'],
          },
          {
            name: 'Tonal Authentic Cadence',
            description: 'Pure classical stability leading cleanly back to the home key.',
            harmonicCharacter: 'I – IV – V – I (Fundamental Diatonic Cadence)',
            template: ['I', 'IV', 'V', 'I'],
          },
          {
            name: 'Sentimental Ballad',
            description: 'Gentle nostalgic warmth beginning with a tender relative minor touch.',
            harmonicCharacter: 'I – vi – IV – V (Doo-wop / 50s Nostalgic Turn)',
            template: ['I', 'vi', 'IV', 'V'],
          },
          {
            name: 'Sophisticated Jazz-Pop',
            description: 'Smooth voice leading utilizing major and minor seventh chords.',
            harmonicCharacter: 'Imaj7 – vi7 – ii7 – V7 (Circle of Fifths Turnaround)',
            template: ['Imaj7', 'vi7', 'ii7', 'V7'],
          },
        ];

    const ticksPerBar = beatsPerBar * TICKS_PER_QUARTER;

    return candidateTemplates.map((item, idx) => {
      const progression: Chord[] = [];
      for (let bar = 0; bar < bars; bar++) {
        const numeral = item.template[bar % item.template.length];
        const startTick = bar * ticksPerBar;
        const durationTicks = ticksPerBar;
        progression.push(romanToChord(numeral, key, scale, startTick, durationTicks));
      }

      // Compute compatibility score against melody
      const score = this.calculateMelodyChordScore(melodyNotes, progression);

      return {
        id: `suggestion-${idx}`,
        name: item.name,
        description: item.description,
        score,
        progression,
        harmonicCharacter: item.harmonicCharacter,
      };
    });
  }

  /**
   * Heuristic compatibility score (0 - 100%) between a melody and a chord progression
   */
  private calculateMelodyChordScore(melodyNotes: Note[], chords: Chord[]): number {
    if (melodyNotes.length === 0) return 85;

    let totalWeight = 0;
    let matchScore = 0;

    for (const note of melodyNotes) {
      // Find which chord covers this note
      const activeChord = chords.find(c => note.startTick >= c.startTick && note.startTick < c.startTick + c.durationTicks);
      if (!activeChord) continue;

      const notePc = ((note.midi % 12) + 12) % 12;
      const rootPc = getPitchClass(activeChord.root);
      const chordIntervals = CHORD_INTERVALS[activeChord.type] || [0, 4, 7];
      const chordPcs = chordIntervals.map(i => (rootPc + i) % 12);

      // Weight downbeats higher than weak 16ths
      const isDownbeat = (note.startTick % TICKS_PER_QUARTER === 0);
      const weight = isDownbeat ? 3 : 1;
      totalWeight += weight;

      if (chordPcs.includes(notePc)) {
        // Direct chord tone! Root/3rd/5th
        matchScore += weight * 1.0;
      } else if (chordPcs.map(pc => (pc + 2) % 12).includes(notePc)) {
        // Harmonious extension (9th, 11th, etc.)
        matchScore += weight * 0.75;
      } else {
        // Passing or neighbor tone
        matchScore += weight * 0.45;
      }
    }

    if (totalWeight === 0) return 85;
    const rawPercentage = (matchScore / totalWeight) * 100;
    // Normalize into realistic musical heuristic range [72, 98]
    return Math.round(Math.min(98, Math.max(72, rawPercentage * 0.7 + 28)));
  }
}
