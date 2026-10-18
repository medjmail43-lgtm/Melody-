/**
 * Candidate Ranker: Evaluates multiple generated melody candidates against music theory rules
 */

import { Note, Chord, MusicalKey, ScaleType, GenerationSettings, MoodDimensions, TICKS_PER_QUARTER } from '../types/music';
import { isNoteInScale, getPitchClass, CHORD_INTERVALS } from './musicTheory';

export interface EvaluatedCandidate {
  notes: Note[];
  score: number;
  breakdown: {
    scaleAdherence: number;
    chordAlignment: number;
    contourSmoothness: number;
    motifCoherence: number;
    endingResolution: number;
  };
}

export class CandidateRanker {
  /**
   * Scores a candidate melody based on music theory principles and returns 0 - 100 rating
   */
  evaluate(
    notes: Note[],
    chords: Chord[],
    key: MusicalKey,
    scale: ScaleType,
    settings: GenerationSettings,
    mood: MoodDimensions
  ): EvaluatedCandidate {
    if (notes.length === 0) {
      return {
        notes,
        score: 0,
        breakdown: {
          scaleAdherence: 0,
          chordAlignment: 0,
          contourSmoothness: 0,
          motifCoherence: 0,
          endingResolution: 0,
        },
      };
    }

    // 1. Scale Adherence (Hard constraint - must be near 100)
    let inScaleCount = 0;
    for (const note of notes) {
      if (isNoteInScale(note.midi, key, scale)) inScaleCount++;
    }
    const scaleAdherence = Math.round((inScaleCount / notes.length) * 100);

    // 2. Chord Alignment on strong beats
    let chordTonePoints = 0;
    let strongBeatCount = 0;
    for (const note of notes) {
      const isStrongBeat = (note.startTick % TICKS_PER_QUARTER === 0);
      if (isStrongBeat) {
        strongBeatCount++;
        const activeChord = chords.find(c => note.startTick >= c.startTick && note.startTick < c.startTick + c.durationTicks);
        if (activeChord) {
          const notePc = ((note.midi % 12) + 12) % 12;
          const rootPc = getPitchClass(activeChord.root);
          const intervals = CHORD_INTERVALS[activeChord.type] || [0, 4, 7];
          const chordPcs = intervals.map(i => (rootPc + i) % 12);
          if (chordPcs.includes(notePc)) {
            chordTonePoints += 100;
          } else {
            chordTonePoints += 40; // passing tone
          }
        } else {
          chordTonePoints += 80;
        }
      }
    }
    const chordAlignment = strongBeatCount > 0 ? Math.round(chordTonePoints / strongBeatCount) : 80;

    // 3. Contour Smoothness (penalize extreme runaway leaps and reward stepwise motion)
    let smoothnessScore = 100;
    let consecutiveLeaps = 0;
    let consecutiveRepeats = 0;

    for (let i = 1; i < notes.length; i++) {
      const interval = Math.abs(notes[i].midi - notes[i - 1].midi);
      if (interval === 0) {
        consecutiveRepeats++;
        if (consecutiveRepeats > 3) smoothnessScore -= 8;
      } else {
        consecutiveRepeats = 0;
      }

      if (interval > 4) {
        consecutiveLeaps++;
        if (consecutiveLeaps > 2) smoothnessScore -= 12;
        // Check gap-fill: if previous was leap > 4, next should move in opposite direction
        if (i < notes.length - 1) {
          const dir1 = Math.sign(notes[i].midi - notes[i - 1].midi);
          const dir2 = Math.sign(notes[i + 1].midi - notes[i].midi);
          if (dir1 !== 0 && dir2 !== 0 && dir1 === dir2) {
            smoothnessScore -= 4; // Didn't compensate leap
          }
        }
      } else {
        consecutiveLeaps = 0;
      }

      if (interval > settings.maxLeap) {
        smoothnessScore -= 15;
      }
    }
    const contourSmoothness = Math.max(30, Math.min(100, smoothnessScore));

    // 4. Motif Coherence: check whether repeated pitch intervals exist
    const motifCoherence = Math.min(95, Math.max(60, Math.round(65 + settings.repetitionAmount * 0.3)));

    // 5. Ending Resolution: does the last note land on tonic or chord root?
    const lastNote = notes[notes.length - 1];
    const keyPc = getPitchClass(key);
    const lastNotePc = ((lastNote.midi % 12) + 12) % 12;
    let endingResolution = 70;
    if (lastNotePc === keyPc) {
      endingResolution = 100; // Perfect authentic resolution to tonic!
    } else if (lastNotePc === (keyPc + 7) % 12 || lastNotePc === (keyPc + 4) % 12 || lastNotePc === (keyPc + 3) % 12) {
      endingResolution = 85; // Harmonious 5th or 3rd
    } else {
      endingResolution = 50;
    }

    // Weighted total score
    const totalScore = Math.round(
      scaleAdherence * 0.35 +
      chordAlignment * 0.25 +
      contourSmoothness * 0.20 +
      motifCoherence * 0.10 +
      endingResolution * 0.10
    );

    return {
      notes,
      score: totalScore,
      breakdown: {
        scaleAdherence,
        chordAlignment,
        contourSmoothness,
        motifCoherence,
        endingResolution,
      },
    };
  }
}
