/**
 * Mood Engine: Translates emotional intent into musical generation parameters
 */

import { MoodDimensions, MoodPreset, GenerationSettings, ScaleType } from '../types/music';

export const MOOD_PRESETS: Record<MoodPreset, MoodDimensions> = {
  Happy: {
    valence: 85,
    energy: 65,
    brightness: 80,
    tension: -60,
    complexity: 30,
  },
  Sad: {
    valence: -80,
    energy: -50,
    brightness: -60,
    tension: 20,
    complexity: 25,
  },
  Mysterious: {
    valence: -20,
    energy: -20,
    brightness: -40,
    tension: 65,
    complexity: 60,
  },
  Dark: {
    valence: -75,
    energy: 40,
    brightness: -85,
    tension: 80,
    complexity: 55,
  },
  Epic: {
    valence: 40,
    energy: 85,
    brightness: 50,
    tension: 50,
    complexity: 70,
  },
  Romantic: {
    valence: 50,
    energy: -25,
    brightness: 40,
    tension: -10,
    complexity: 45,
  },
  Dreamy: {
    valence: 30,
    energy: -70,
    brightness: 30,
    tension: -40,
    complexity: 35,
  },
  Aggressive: {
    valence: -60,
    energy: 90,
    brightness: -30,
    tension: 85,
    complexity: 65,
  },
  Nostalgic: {
    valence: -20,
    energy: -40,
    brightness: 10,
    tension: -20,
    complexity: 35,
  },
  Medieval: {
    valence: -10,
    energy: 10,
    brightness: -20,
    tension: 20,
    complexity: 50,
  },
  Hopeful: {
    valence: 70,
    energy: 35,
    brightness: 65,
    tension: -40,
    complexity: 30,
  },
};

// Map mood dimensions to generation settings modifiers
export function applyMoodToSettings(
  mood: MoodDimensions,
  baseSettings: GenerationSettings
): GenerationSettings {
  // Energy directly influences density and rhythmic complexity
  const densityMod = Math.round(((mood.energy + 100) / 200) * 50 + 25); // 25 - 75
  const rhythmComplexityMod = Math.round(((mood.energy + 100) / 200) * 40 + ((mood.complexity + 100) / 200) * 40);
  
  // Complexity scales melodic complexity and leap size
  const melodicComplexityMod = Math.round(((mood.complexity + 100) / 200) * 60 + 20);
  const maxLeapMod = mood.energy > 50 || mood.complexity > 50 ? 12 : 7;
  
  // Tension influences musical tension slider and syncopation
  const tensionMod = Math.round(((mood.tension + 100) / 200) * 80 + 10);
  
  // Valence & stability influence ending resolution strength
  const resolutionMod = Math.round(((100 - mood.tension) / 200) * 60 + 30);
  
  // Repetition is higher in simpler / energetic pop/edm/lofi moods
  const repetitionMod = Math.max(20, Math.min(85, Math.round(70 - mood.complexity * 0.3)));

  return {
    ...baseSettings,
    noteDensity: Math.round((baseSettings.noteDensity * 0.4) + (densityMod * 0.6)),
    rhythmicComplexity: Math.round((baseSettings.rhythmicComplexity * 0.4) + (rhythmComplexityMod * 0.6)),
    melodicComplexity: Math.round((baseSettings.melodicComplexity * 0.4) + (melodicComplexityMod * 0.6)),
    tension: Math.round((baseSettings.tension * 0.3) + (tensionMod * 0.7)),
    resolutionStrength: Math.round((baseSettings.resolutionStrength * 0.3) + (resolutionMod * 0.7)),
    repetitionAmount: Math.round((baseSettings.repetitionAmount * 0.4) + (repetitionMod * 0.6)),
    maxLeap: maxLeapMod,
  };
}

// Recommend scale types based on emotional intent
export function recommendScalesForMood(mood: MoodDimensions): ScaleType[] {
  if (mood.valence > 40 && mood.brightness > 20) {
    return ['major', 'lydian', 'mixolydian'];
  }
  if (mood.tension > 60 || mood.brightness < -50) {
    return ['harmonic_minor', 'phrygian', 'natural_minor'];
  }
  if (mood.complexity > 40) {
    return ['dorian', 'melodic_minor', 'mixolydian'];
  }
  return ['natural_minor', 'dorian', 'major'];
}
