/**
 * Rhythm Engine: Generates genre-specific rhythmic motifs, timing onsets, and durations
 */

import { Genre, GenerationSettings, TICKS_PER_QUARTER } from '../types/music';
import { PRNG } from './prng';

export interface RhythmSlot {
  startTick: number;
  durationTicks: number;
  accent: boolean;
  isRest: boolean;
}

export class RhythmEngine {
  private prng: PRNG;

  constructor(prng: PRNG) {
    this.prng = prng;
  }

  /**
   * Generate rhythmic slots for a given number of bars according to genre and settings
   */
  generatePattern(
    bars: number,
    genre: Genre,
    settings: GenerationSettings,
    beatsPerBar: number = 4
  ): RhythmSlot[] {
    const barDuration = beatsPerBar * TICKS_PER_QUARTER; // 3840 ticks for 4/4
    const phraseBars = Math.min(settings.phraseLengthBars, bars);
    
    // First generate a master rhythm motif for the phrase length (e.g. 1 or 2 bars)
    const masterMotif = this.generateBarMotif(genre, settings, beatsPerBar, phraseBars);
    
    const allSlots: RhythmSlot[] = [];
    const numPhrases = Math.ceil(bars / phraseBars);
    
    for (let phraseIdx = 0; phraseIdx < numPhrases; phraseIdx++) {
      const phraseStartTick = phraseIdx * phraseBars * barDuration;
      const isFinalPhrase = phraseIdx === numPhrases - 1;
      
      // Decide whether to repeat master motif or vary it
      const shouldVary = this.prng.next() * 100 > settings.repetitionAmount;
      const activeMotif = shouldVary
        ? this.varyMotif(masterMotif, settings.rhythmicVariation, phraseBars * barDuration)
        : masterMotif;

      for (const slot of activeMotif) {
        const absoluteStart = phraseStartTick + slot.startTick;
        
        // If beyond total requested bars, break
        if (absoluteStart >= bars * barDuration) break;
        
        // Adjust duration so it doesn't cross the end of the composition
        const maxDuration = Math.min(slot.durationTicks, (bars * barDuration) - absoluteStart);
        if (maxDuration <= 0) continue;

        // If it's the final bar of the final phrase and resolution strength is high, ensure a decisive ending note
        if (isFinalPhrase && absoluteStart >= (bars - 1) * barDuration + (barDuration / 2) && settings.resolutionStrength > 70) {
          allSlots.push({
            startTick: absoluteStart,
            durationTicks: maxDuration,
            accent: true,
            isRest: false,
          });
          break; // Conclude phrase
        }

        allSlots.push({
          startTick: absoluteStart,
          durationTicks: maxDuration,
          accent: slot.accent,
          isRest: slot.isRest,
        });
      }
    }

    return allSlots.filter(s => !s.isRest);
  }

  /**
   * Generates a 1-to-2 bar rhythmic motif based on genre templates & density
   */
  private generateBarMotif(
    genre: Genre,
    settings: GenerationSettings,
    beatsPerBar: number,
    phraseBars: number
  ): RhythmSlot[] {
    const totalTicks = phraseBars * beatsPerBar * TICKS_PER_QUARTER;
    const slots: RhythmSlot[] = [];

    // Base grid resolution based on rhythmic complexity
    // 0-30: Quarters / 8ths; 31-70: 8ths & 16ths; 71-100: Complex syncopated 16ths / triplets
    const sixteenth = TICKS_PER_QUARTER / 4; // 240 ticks
    const eighth = TICKS_PER_QUARTER / 2;    // 480 ticks
    const quarter = TICKS_PER_QUARTER;      // 960 ticks

    let currentTick = 0;

    while (currentTick < totalTicks) {
      const remainingTicks = totalTicks - currentTick;
      
      // Determine candidate note duration based on genre and density
      const durationOptions = this.getDurationWeights(genre, settings, remainingTicks);
      const chosenDuration = this.prng.weightedChoice(durationOptions);

      // Rest probability based on noteDensity (high density = low rest probability)
      const restThreshold = Math.max(5, 55 - (settings.noteDensity * 0.5));
      const isRest = this.prng.next() * 100 < restThreshold && currentTick > 0 && remainingTicks > quarter;

      // Syncopation check: sometimes shift start tick by a 16th if syncopation is high
      let startTick = currentTick;
      const isSyncopated = (this.prng.next() * 100 < settings.syncopationAmount) && (genre === 'Funk' || genre === 'Jazz' || genre === 'Hip-Hop');
      if (isSyncopated && remainingTicks > eighth && (currentTick % eighth === 0)) {
        startTick += sixteenth;
      }

      // Accent: strong on downbeats, or syncopated accents
      const isDownbeat = (startTick % quarter === 0);
      const accent = isDownbeat || (isSyncopated && this.prng.next() > 0.4);

      slots.push({
        startTick,
        durationTicks: Math.min(chosenDuration, totalTicks - startTick),
        accent,
        isRest,
      });

      currentTick += chosenDuration;
    }

    return slots;
  }

  /**
   * Duration probabilities weighted by genre and density
   */
  private getDurationWeights(
    genre: Genre,
    settings: GenerationSettings,
    remaining: number
  ): { item: number; weight: number }[] {
    const sixteenth = 240;
    const eighth = 480;
    const quarter = 960;
    const half = 1920;
    const dottedEighth = 720;

    const density = settings.noteDensity;

    switch (genre) {
      case 'Funk':
        return [
          { item: sixteenth, weight: density > 60 ? 60 : 35 },
          { item: eighth, weight: 35 },
          { item: dottedEighth, weight: 25 },
          { item: quarter, weight: 15 },
        ].filter(d => d.item <= remaining);

      case 'Classical':
        return [
          { item: eighth, weight: 45 },
          { item: quarter, weight: 40 },
          { item: sixteenth, weight: 20 },
          { item: half, weight: 25 },
        ].filter(d => d.item <= remaining);

      case 'Jazz':
        return [
          { item: eighth, weight: 50 },
          { item: dottedEighth, weight: 30 },
          { item: sixteenth, weight: 25 },
          { item: quarter, weight: 35 },
        ].filter(d => d.item <= remaining);

      case 'EDM':
        return [
          { item: sixteenth, weight: density > 50 ? 55 : 30 },
          { item: eighth, weight: 45 },
          { item: quarter, weight: 20 },
        ].filter(d => d.item <= remaining);

      case 'Lo-fi':
        return [
          { item: eighth, weight: 50 },
          { item: quarter, weight: 40 },
          { item: dottedEighth, weight: 20 },
          { item: half, weight: 15 },
        ].filter(d => d.item <= remaining);

      case 'Ambient':
        return [
          { item: half, weight: 55 },
          { item: quarter * 3, weight: 40 },
          { item: quarter, weight: 30 },
          { item: eighth, weight: 10 },
        ].filter(d => d.item <= remaining);

      case 'Cinematic':
        return [
          { item: quarter, weight: 45 },
          { item: half, weight: 35 },
          { item: eighth, weight: 30 },
          { item: dottedEighth, weight: 20 },
        ].filter(d => d.item <= remaining);

      case 'Medieval':
        return [
          { item: quarter, weight: 55 },
          { item: eighth, weight: 30 },
          { item: half, weight: 35 },
        ].filter(d => d.item <= remaining);

      case 'Dark Fantasy':
        return [
          { item: eighth, weight: 45 },
          { item: quarter, weight: 40 },
          { item: sixteenth, weight: 25 },
          { item: half, weight: 30 },
        ].filter(d => d.item <= remaining);

      default: // Pop & Custom
        return [
          { item: eighth, weight: 45 },
          { item: quarter, weight: 40 },
          { item: sixteenth, weight: 25 },
          { item: half, weight: 15 },
        ].filter(d => d.item <= remaining);
    }
  }

  /**
   * Vary an existing rhythmic motif slightly to create musical interest without losing coherence
   */
  private varyMotif(original: RhythmSlot[], variationAmount: number, maxTicks: number): RhythmSlot[] {
    return original.map(slot => {
      if (this.prng.next() * 100 > variationAmount) {
        return { ...slot };
      }
      
      // Slight shift or duration split
      const action = this.prng.choice(['split', 'extend', 'shorten', 'keep']);
      if (action === 'extend') {
        return {
          ...slot,
          durationTicks: Math.min(slot.durationTicks * 1.5, maxTicks - slot.startTick),
        };
      } else if (action === 'shorten') {
        return {
          ...slot,
          durationTicks: Math.max(240, Math.floor(slot.durationTicks * 0.75)),
        };
      }
      return { ...slot };
    });
  }
}
