/**
 * Melody Engine: Intelligent rule-based melody generator with controlled probability,
 * multi-archetype phrasing (Antecedent-Consequent, Arch, Cascade, Hook, Apex Climax),
 * harmonic voice leading, and candidate tournament scoring.
 */

import { Note, Chord, Genre, MusicalKey, ScaleType, MoodDimensions, GenerationSettings, TICKS_PER_QUARTER } from '../types/music';
import { PRNG } from './prng';
import { RhythmEngine, RhythmSlot } from './rhythmEngine';
import { CandidateRanker, EvaluatedCandidate } from './candidateRanker';
import {
  getScaleNotesInRange,
  getPitchClass,
  isNoteInScale,
  snapToScale,
  CHORD_INTERVALS,
} from './musicTheory';

export interface GenerationResult {
  notes: Note[];
  candidate: EvaluatedCandidate;
  allCandidates: EvaluatedCandidate[];
  archetype: string;
}

export type MelodicArchetype = 'arch' | 'call_response' | 'apex_climax' | 'cascade' | 'hook_groove' | 'wave';

export class MelodyEngine {
  private ranker: CandidateRanker;

  constructor(_seed: number = 42) {
    this.ranker = new CandidateRanker();
  }

  /**
   * Main melody generation entry point.
   * Runs an intelligent tournament among diverse melodic archetypes and returns the highest-scoring candidate.
   */
  generateMelody(
    bars: number,
    genre: Genre,
    key: MusicalKey,
    scale: ScaleType,
    mood: MoodDimensions,
    settings: GenerationSettings,
    chords: Chord[],
    candidateCount: number = 6
  ): GenerationResult {
    const archetypes: MelodicArchetype[] = [
      'call_response',
      'arch',
      'hook_groove',
      'apex_climax',
      'cascade',
      'wave',
    ];

    const candidates: { evaluated: EvaluatedCandidate; archetype: MelodicArchetype }[] = [];

    for (let c = 0; c < candidateCount; c++) {
      const candidateSeed = (settings.seed * 1664525 + c * 1013904223 + 31) >>> 0;
      const archetype = archetypes[c % archetypes.length];

      const candidateNotes = this.generateArchetypeMelody(
        bars,
        genre,
        key,
        scale,
        mood,
        settings,
        chords,
        archetype,
        candidateSeed
      );

      const evaluated = this.ranker.evaluate(candidateNotes, chords, key, scale, settings, mood);
      candidates.push({ evaluated, archetype });
    }

    // Sort descending by score
    candidates.sort((a, b) => b.evaluated.score - a.evaluated.score);
    const winner = candidates[0];

    return {
      notes: winner.evaluated.notes,
      candidate: winner.evaluated,
      allCandidates: candidates.map(c => c.evaluated),
      archetype: winner.archetype,
    };
  }

  /**
   * Generates a single candidate melody according to a specific musical contour archetype
   */
  private generateArchetypeMelody(
    bars: number,
    genre: Genre,
    key: MusicalKey,
    scale: ScaleType,
    mood: MoodDimensions,
    settings: GenerationSettings,
    chords: Chord[],
    archetype: MelodicArchetype,
    seed: number
  ): Note[] {
    const prng = new PRNG(seed);
    const rhythmEngine = new RhythmEngine(prng);

    const beatsPerBar = 4;
    const ticksPerBar = beatsPerBar * TICKS_PER_QUARTER;
    const totalTicks = bars * ticksPerBar;

    // 1. Generate intelligent rhythm slots
    const rhythmSlots = rhythmEngine.generatePattern(bars, genre, settings, beatsPerBar);
    if (rhythmSlots.length === 0) return [];

    // 2. Scale notes in bounded register
    const scaleNotes = getScaleNotesInRange(key, scale, settings.minPitch, settings.maxPitch);
    if (scaleNotes.length === 0) return [];

    const keyPc = getPitchClass(key);
    // Find central octave root tonic (approx C4-C5 range: 60-72)
    const centerTonic = scaleNotes.find(m => ((m % 12) + 12) % 12 === keyPc && m >= 60 && m <= 72)
      || scaleNotes[Math.floor(scaleNotes.length / 2)];

    const centerIdx = scaleNotes.indexOf(centerTonic);
    const validCenterIdx = centerIdx >= 0 ? centerIdx : Math.floor(scaleNotes.length / 2);

    // 3. Craft Motif A (1-2 bars) with strong melodic identity
    const phraseTicks = Math.max(1, settings.phraseLengthBars) * ticksPerBar;
    const motifSlots = rhythmSlots.filter(s => s.startTick < phraseTicks);
    const motifPitches: number[] = [];

    let currentPitch = centerTonic;
    let previousInterval = 0;

    for (let i = 0; i < motifSlots.length; i++) {
      const slot = motifSlots[i];
      const isDownbeat = (slot.startTick % TICKS_PER_QUARTER === 0);
      const isPhraseEnd = (i === motifSlots.length - 1);
      const activeChord = chords.find(c => slot.startTick >= c.startTick && slot.startTick < c.startTick + c.durationTicks);

      const targetPitch = this.pickHarmonicPitch({
        currentPitch,
        previousInterval,
        isDownbeat,
        activeChord,
        scaleNotes,
        keyPc,
        settings,
        mood,
        isPhraseEnd,
        phraseQuestion: true,
        prng,
        biasRatio: (i / Math.max(1, motifSlots.length)),
        archetype,
      });

      motifPitches.push(targetPitch);
      previousInterval = targetPitch - currentPitch;
      currentPitch = targetPitch;
    }

    // 4. Create transformed motifs: Inverted and Sequenced (+2 scale steps)
    const invertedMotif = motifPitches.map(p => {
      const idx = scaleNotes.indexOf(p);
      if (idx === -1) return p;
      const dist = idx - validCenterIdx;
      const invIdx = Math.max(0, Math.min(scaleNotes.length - 1, validCenterIdx - dist));
      return scaleNotes[invIdx];
    });

    const sequencedMotif = motifPitches.map(p => {
      const idx = scaleNotes.indexOf(p);
      if (idx === -1) return p;
      const seqIdx = Math.max(0, Math.min(scaleNotes.length - 1, idx + 2)); // Up a diatonic 3rd
      return scaleNotes[seqIdx];
    });

    // 5. Build full piece across bars using the selected Archetype
    const notes: Note[] = [];
    let noteIdCounter = 0;

    for (let i = 0; i < rhythmSlots.length; i++) {
      const slot = rhythmSlots[i];
      const progress = slot.startTick / totalTicks; // 0.0 -> 1.0
      const phraseIndex = Math.floor(slot.startTick / phraseTicks);
      const isEvenPhrase = (phraseIndex % 2 === 0);
      const isFinalBar = slot.startTick >= (bars - 1) * ticksPerBar;
      const isLastNote = (i === rhythmSlots.length - 1);
      const activeChord = chords.find(c => slot.startTick >= c.startTick && slot.startTick < c.startTick + c.durationTicks);
      const isDownbeat = (slot.startTick % TICKS_PER_QUARTER === 0);

      // Golden ratio climax zone (around 62% - 78% of the piece)
      const isClimaxZone = progress >= 0.60 && progress <= 0.80;

      let pitch: number;

      if (phraseIndex === 0 && i < motifPitches.length) {
        // First phrase establishes the core thematic motif
        pitch = motifPitches[i];
      } else {
        const slotInMotif = i % Math.max(1, motifPitches.length);
        const repeatChance = settings.repetitionAmount;

        if (prng.next() * 100 < repeatChance && !isFinalBar && !isClimaxZone) {
          // Repeat or sequenced motif
          if (archetype === 'hook_groove') {
            pitch = motifPitches[slotInMotif] || centerTonic;
          } else if (isEvenPhrase) {
            pitch = sequencedMotif[slotInMotif] || centerTonic;
          } else {
            pitch = invertedMotif[slotInMotif] || centerTonic;
          }
        } else if (isClimaxZone && settings.melodicComplexity > 35) {
          // Emotional peak! Soar in the upper register of the scale
          const upperIndex = Math.min(scaleNotes.length - 1, Math.floor(validCenterIdx + scaleNotes.length * 0.28));
          pitch = scaleNotes[upperIndex] || centerTonic;
          // If active chord exists, snap to closest chord tone
          if (activeChord) {
            const chordTones = this.getChordNotesInRange(activeChord, scaleNotes);
            const highChordTone = chordTones.find(ct => ct >= pitch - 3 && ct <= pitch + 4);
            if (highChordTone) pitch = highChordTone;
          }
        } else if (archetype === 'cascade') {
          // Descending contour
          const cascadeIdx = Math.max(0, Math.floor(validCenterIdx + (1 - progress) * 6 - (i % 3)));
          pitch = scaleNotes[cascadeIdx] || centerTonic;
        } else if (archetype === 'arch') {
          // Peak at middle
          const archHeight = Math.sin(progress * Math.PI);
          const archIdx = Math.max(0, Math.min(scaleNotes.length - 1, Math.floor(validCenterIdx + archHeight * 6)));
          pitch = scaleNotes[archIdx] || centerTonic;
        } else {
          // Harmonic context voice-leading
          pitch = this.pickHarmonicPitch({
            currentPitch,
            previousInterval,
            isDownbeat,
            activeChord,
            scaleNotes,
            keyPc,
            settings,
            mood,
            isPhraseEnd: isLastNote,
            phraseQuestion: isEvenPhrase,
            prng,
            biasRatio: progress,
            archetype,
          });
        }
      }

      // Strong Cadential Finalization on the ending note
      if (isLastNote && settings.resolutionStrength > 30) {
        // Conclusively resolve to key root tonic in central octave
        pitch = centerTonic;
      } else if (isFinalBar && isDownbeat && settings.resolutionStrength > 65) {
        if (activeChord) {
          const rootPc = getPitchClass(activeChord.root);
          const chordRoot = scaleNotes.find(m => ((m % 12) + 12) % 12 === rootPc && m >= 58 && m <= 74);
          if (chordRoot) pitch = chordRoot;
        }
      }

      // Strict sanity checks & scale conformity
      pitch = Math.max(settings.minPitch, Math.min(settings.maxPitch, pitch));
      pitch = snapToScale(pitch, key, scale);

      // Compute dynamic musical velocity
      let velocity = isDownbeat ? prng.nextInt(100, 114) : prng.nextInt(80, 94);
      if (slot.accent) velocity = Math.min(127, velocity + 14);
      if (isClimaxZone) velocity = Math.min(127, velocity + 8);
      if (isLastNote) velocity = Math.max(88, velocity - 6); // Gentle cadential landing

      notes.push({
        id: `note-${slot.startTick}-${pitch}-${noteIdCounter++}`,
        midi: pitch,
        startTick: slot.startTick,
        durationTicks: slot.durationTicks,
        velocity,
        selected: false,
      });

      previousInterval = pitch - currentPitch;
      currentPitch = pitch;
    }

    return notes;
  }

  /**
   * Intelligently selects the next pitch based on chord tones, stepwise smoothness,
   * gap-fill leaps, and tension parameters.
   */
  private pickHarmonicPitch(ctx: {
    currentPitch: number;
    previousInterval: number;
    isDownbeat: boolean;
    activeChord?: Chord;
    scaleNotes: number[];
    keyPc: number;
    settings: GenerationSettings;
    mood: MoodDimensions;
    isPhraseEnd: boolean;
    phraseQuestion: boolean;
    prng: PRNG;
    biasRatio: number;
    archetype: MelodicArchetype;
  }): number {
    const {
      currentPitch,
      previousInterval,
      isDownbeat,
      activeChord,
      scaleNotes,
      keyPc,
      settings,
      mood,
      isPhraseEnd,
      phraseQuestion,
      prng,
      biasRatio,
    } = ctx;

    const currentIdx = scaleNotes.indexOf(currentPitch);
    const validIdx = currentIdx >= 0 ? currentIdx : Math.floor(scaleNotes.length / 2);

    // If phrase ending with high resolution
    if (isPhraseEnd && settings.resolutionStrength > 50) {
      if (phraseQuestion) {
        // Question: Land on scale degree 2 (supertonic) or 5 (dominant)
        const openCadence = scaleNotes.find(m => {
          const pc = ((m % 12) + 12) % 12;
          return pc === (keyPc + 7) % 12 || pc === (keyPc + 2) % 12;
        });
        if (openCadence) return openCadence;
      } else {
        // Answer: Land on key root or chord root
        const closedCadence = scaleNotes.find(m => {
          const pc = ((m % 12) + 12) % 12;
          return pc === keyPc && Math.abs(m - currentPitch) <= 8;
        });
        if (closedCadence) return closedCadence;
      }
    }

    // Evaluate local candidate steps
    const candidates: { pitch: number; weight: number }[] = [];

    // Chord tones for the active chord
    const chordToneMidis = activeChord ? this.getChordNotesInRange(activeChord, scaleNotes) : [];

    for (let offset = -4; offset <= 4; offset++) {
      const idx = validIdx + offset;
      if (idx < 0 || idx >= scaleNotes.length) continue;

      const pitch = scaleNotes[idx];
      const interval = Math.abs(pitch - currentPitch);
      if (interval > settings.maxLeap) continue;

      let weight = 15;

      // 1. Stepwise voice leading (1 - 3 semitones)
      if (interval >= 1 && interval <= 3) {
        weight += 45; // Smooth singable lyrical line
      } else if (interval === 0) {
        // Repeated pitch
        weight += (mood.energy > 60 || settings.repetitionAmount > 65) ? 25 : 8;
      } else if (interval >= 4 && interval <= 7) {
        // Arpeggio leap (minor/major 3rd, 4th, 5th)
        weight += 20;
      }

      // 2. Classical Gap-Fill Rule: Leaps (>4 semitones) must be followed by stepwise motion in opposite direction
      if (Math.abs(previousInterval) >= 4) {
        const dir = Math.sign(pitch - currentPitch);
        const prevDir = Math.sign(previousInterval);
        if (dir !== 0 && prevDir !== 0 && dir === -prevDir) {
          weight += 40; // Satisfying musical recovery!
        }
      }

      // 3. Downbeat Chord Tone Preference
      if (isDownbeat && chordToneMidis.includes(pitch)) {
        weight += 55; // Resonant harmonic alignment
      }

      // 4. Emotional Mood Adjustments
      if (mood.valence > 60) {
        // Uplifting: favor major 3rd, 5th, or upward step
        if (pitch > currentPitch) weight += 15;
      } else if (mood.valence < 40) {
        // Melancholic / dark: favor gentle downward drift
        if (pitch < currentPitch) weight += 15;
      }

      if (settings.tension > 60 && !isDownbeat) {
        // Favor expressive non-chord tones (tensions/suspensions)
        if (!chordToneMidis.includes(pitch)) weight += 20;
      }

      candidates.push({ pitch, weight: Math.max(1, weight) });
    }

    if (candidates.length === 0) return currentPitch;
    return prng.weightedChoice(candidates.map(c => ({ item: c.pitch, weight: c.weight })));
  }

  /**
   * Returns all scale pitches that are chord tones for the specified chord
   */
  private getChordNotesInRange(chord: Chord, scaleNotes: number[]): number[] {
    const rootPc = getPitchClass(chord.root);
    const intervals = CHORD_INTERVALS[chord.type] || [0, 4, 7];
    const chordPcs = new Set(intervals.map(i => (rootPc + i) % 12));

    return scaleNotes.filter(m => chordPcs.has(((m % 12) + 12) % 12));
  }
}
