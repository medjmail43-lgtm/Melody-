/**
 * Melody Generation & Musical Parameters Panel:
 * Controls for Genre, Bars, Key, Scale, Mood presets & continuous dimensions,
 * detailed algorithmic settings, and instrument selection.
 */

import React, { useState } from 'react';
import {
  Genre,
  MusicalKey,
  ScaleType,
  MoodPreset,
  MoodDimensions,
  GenerationSettings,
  InstrumentType,
} from '../types/music';
import { GENRE_PROFILES } from '../engine/genreProfiles';
import { MOOD_PRESETS, applyMoodToSettings } from '../engine/moodEngine';
import { NOTE_NAMES, SCALE_NAMES } from '../engine/musicTheory';
import {
  Sliders,
  Sparkles,
  Dices,
  ChevronDown,
  ChevronUp,
  Layers,
  Music,
  Gauge,
  HelpCircle,
} from 'lucide-react';

interface GenerationPanelProps {
  genre: Genre;
  onGenreChange: (genre: Genre) => void;
  bars: number;
  onBarsChange: (bars: number) => void;
  musicalKey: MusicalKey;
  onMusicalKeyChange: (key: MusicalKey) => void;
  scale: ScaleType;
  onScaleChange: (scale: ScaleType) => void;
  moodPreset: MoodPreset | 'Custom';
  onMoodPresetChange: (preset: MoodPreset | 'Custom') => void;
  moodDimensions: MoodDimensions;
  onMoodDimensionsChange: (mood: MoodDimensions) => void;
  settings: GenerationSettings;
  onSettingsChange: (settings: GenerationSettings) => void;
  melodyInstrument: InstrumentType;
  onMelodyInstrumentChange: (inst: InstrumentType) => void;
  chordInstrument: InstrumentType;
  onChordInstrumentChange: (inst: InstrumentType) => void;
  onApplyAndGenerate: () => void;
  autoRollSeed?: boolean;
  onToggleAutoRollSeed?: () => void;
}

const GENRE_LIST: Genre[] = [
  'Funk',
  'Classical',
  'Jazz',
  'EDM',
  'Pop',
  'Hip-Hop',
  'Lo-fi',
  'Ambient',
  'Cinematic',
  'Medieval',
  'Dark Fantasy',
  'Custom',
];

const MOOD_LIST: MoodPreset[] = [
  'Happy',
  'Sad',
  'Mysterious',
  'Dark',
  'Epic',
  'Romantic',
  'Dreamy',
  'Aggressive',
  'Nostalgic',
  'Medieval',
  'Hopeful',
];

const INSTRUMENT_OPTIONS: { id: InstrumentType; label: string }[] = [
  { id: 'grand_piano', label: 'Grand Piano' },
  { id: 'electric_piano', label: 'Electric Piano (Rhodes)' },
  { id: 'synth_lead', label: 'Synth Lead' },
  { id: 'pluck', label: 'Pluck Synth' },
  { id: 'strings', label: 'Ensemble Strings' },
  { id: 'warm_pad', label: 'Warm Pad' },
  { id: 'bass', label: 'Acoustic / Sub Bass' },
];

export const GenerationPanel: React.FC<GenerationPanelProps> = ({
  genre,
  onGenreChange,
  bars,
  onBarsChange,
  musicalKey,
  onMusicalKeyChange,
  scale,
  onScaleChange,
  moodPreset,
  onMoodPresetChange,
  moodDimensions,
  onMoodDimensionsChange,
  settings,
  onSettingsChange,
  melodyInstrument,
  onMelodyInstrumentChange,
  chordInstrument,
  onChordInstrumentChange,
  onApplyAndGenerate,
  autoRollSeed = true,
  onToggleAutoRollSeed,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Handle preset select
  const handleSelectPreset = (preset: MoodPreset) => {
    onMoodPresetChange(preset);
    const dimensions = MOOD_PRESETS[preset];
    onMoodDimensionsChange(dimensions);
    // Dynamically adjust generation settings based on mood
    const adjusted = applyMoodToSettings(dimensions, settings);
    onSettingsChange(adjusted);
  };

  // Handle single dimension slider
  const handleDimensionChange = (key: keyof MoodDimensions, val: number) => {
    const updated = { ...moodDimensions, [key]: val };
    onMoodPresetChange('Custom');
    onMoodDimensionsChange(updated);
    const adjusted = applyMoodToSettings(updated, settings);
    onSettingsChange(adjusted);
  };

  // Roll new seed
  const rollDiceSeed = () => {
    const newSeed = Math.floor(Math.random() * 900000) + 10000;
    onSettingsChange({ ...settings, seed: newSeed });
  };

  return (
    <aside className="w-full lg:w-80 bg-[#12151b] border-r border-[#222733] flex flex-col h-full overflow-hidden shrink-0 text-slate-300 text-xs select-none">
      {/* Panel Header */}
      <div className="p-3 border-b border-[#222733] flex items-center justify-between bg-[#151922]">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-teal-400" />
          <h2 className="font-semibold text-slate-100 tracking-tight text-xs uppercase">
            Melody Engine Config
          </h2>
        </div>
        <button
          onClick={onApplyAndGenerate}
          className="px-2.5 py-1 rounded bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 border border-teal-500/30 font-medium text-[11px] transition-colors"
        >
          Apply & Generate
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Genre Selection */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
            Musical Genre
          </label>
          <div className="grid grid-cols-3 gap-1">
            {GENRE_LIST.map((g) => {
              const active = genre === g;
              return (
                <button
                  key={g}
                  onClick={() => {
                    onGenreChange(g);
                    const profile = GENRE_PROFILES[g];
                    if (profile) {
                      onSettingsChange({
                        ...settings,
                        ...profile.defaultSettings,
                        seed: settings.seed,
                      });
                      if (profile.preferredScales.length > 0) {
                        onScaleChange(profile.preferredScales[0]);
                      }
                    }
                  }}
                  className={`px-2 py-1.5 rounded text-[11px] font-medium text-center truncate transition-colors ${
                    active
                      ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-[#1a1f29] border border-[#2b3342] text-slate-300 hover:text-white hover:border-teal-500/40'
                  }`}
                  title={GENRE_PROFILES[g]?.description}
                >
                  {g}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 italic leading-tight">
            {GENRE_PROFILES[genre]?.description}
          </p>
        </div>

        {/* Bars and Key/Scale row */}
        <div className="grid grid-cols-2 gap-2">
          {/* Bars */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              Length (Bars)
            </label>
            <div className="grid grid-cols-3 gap-1">
              {[1, 2, 4, 8, 16, 32].map((b) => (
                <button
                  key={b}
                  onClick={() => onBarsChange(b)}
                  className={`py-1 text-[11px] font-mono rounded font-medium text-center transition-colors ${
                    bars === b
                      ? 'bg-teal-500 text-slate-950 font-bold'
                      : 'bg-[#1a1f29] border border-[#2b3342] text-slate-300 hover:text-white'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Key */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              Root Key
            </label>
            <select
              value={musicalKey}
              onChange={(e) => onMusicalKeyChange(e.target.value as MusicalKey)}
              className="w-full bg-[#1a1f29] border border-[#2b3342] rounded px-2 py-1 font-mono text-slate-100 text-xs focus:outline-none focus:border-teal-500"
            >
              {NOTE_NAMES.map((k) => (
                <option key={k} value={k} className="bg-[#14171e]">
                  {k}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Scale Selection */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
            Scale / Mode
          </label>
          <select
            value={scale}
            onChange={(e) => onScaleChange(e.target.value as ScaleType)}
            className="w-full bg-[#1a1f29] border border-[#2b3342] rounded px-2 py-1 text-slate-100 text-xs focus:outline-none focus:border-teal-500"
          >
            {Object.entries(SCALE_NAMES).map(([val, label]) => (
              <option key={val} value={val} className="bg-[#14171e]">
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Mood Presets */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Mood Character
            </label>
            {moodPreset !== 'Custom' && (
              <span className="text-[10px] text-teal-400 font-medium">Preset: {moodPreset}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {MOOD_LIST.map((m) => {
              const active = moodPreset === m;
              return (
                <button
                  key={m}
                  onClick={() => handleSelectPreset(m)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                    active
                      ? 'bg-teal-500 text-slate-950 font-bold'
                      : 'bg-[#1a1f29] border border-[#2b3342] text-slate-300 hover:text-white'
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        {/* Continuous Mood Sliders */}
        <div className="space-y-2 bg-[#171b24] p-2.5 rounded-lg border border-[#252c3a]">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
            <span>Emotional Dimensions</span>
            <span className="text-teal-400 lowercase font-mono">continuous</span>
          </div>

          {/* Valence: Sad <-> Happy */}
          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>Sad</span>
              <span className="text-teal-400 font-mono font-medium">{moodDimensions.valence > 0 ? `+${moodDimensions.valence}` : moodDimensions.valence}</span>
              <span>Happy</span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              value={moodDimensions.valence}
              onChange={(e) => handleDimensionChange('valence', parseInt(e.target.value))}
              className="w-full h-1 bg-slate-700 rounded appearance-none accent-teal-400 cursor-pointer"
            />
          </div>

          {/* Energy: Calm <-> Energetic */}
          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>Calm</span>
              <span className="text-teal-400 font-mono font-medium">{moodDimensions.energy > 0 ? `+${moodDimensions.energy}` : moodDimensions.energy}</span>
              <span>Energetic</span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              value={moodDimensions.energy}
              onChange={(e) => handleDimensionChange('energy', parseInt(e.target.value))}
              className="w-full h-1 bg-slate-700 rounded appearance-none accent-teal-400 cursor-pointer"
            />
          </div>

          {/* Brightness: Dark <-> Bright */}
          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>Dark</span>
              <span className="text-teal-400 font-mono font-medium">{moodDimensions.brightness > 0 ? `+${moodDimensions.brightness}` : moodDimensions.brightness}</span>
              <span>Bright</span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              value={moodDimensions.brightness}
              onChange={(e) => handleDimensionChange('brightness', parseInt(e.target.value))}
              className="w-full h-1 bg-slate-700 rounded appearance-none accent-teal-400 cursor-pointer"
            />
          </div>

          {/* Tension: Stable <-> Tense */}
          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>Stable</span>
              <span className="text-teal-400 font-mono font-medium">{moodDimensions.tension > 0 ? `+${moodDimensions.tension}` : moodDimensions.tension}</span>
              <span>Tense</span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              value={moodDimensions.tension}
              onChange={(e) => handleDimensionChange('tension', parseInt(e.target.value))}
              className="w-full h-1 bg-slate-700 rounded appearance-none accent-teal-400 cursor-pointer"
            />
          </div>

          {/* Complexity: Simple <-> Complex */}
          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>Simple</span>
              <span className="text-teal-400 font-mono font-medium">{moodDimensions.complexity > 0 ? `+${moodDimensions.complexity}` : moodDimensions.complexity}</span>
              <span>Complex</span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              value={moodDimensions.complexity}
              onChange={(e) => handleDimensionChange('complexity', parseInt(e.target.value))}
              className="w-full h-1 bg-slate-700 rounded appearance-none accent-teal-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Instruments Selection */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
            Sound Design / Instruments
          </label>
          <div>
            <span className="text-[10px] text-slate-400 block mb-0.5">Melody Instrument</span>
            <select
              value={melodyInstrument}
              onChange={(e) => onMelodyInstrumentChange(e.target.value as InstrumentType)}
              className="w-full bg-[#1a1f29] border border-[#2b3342] rounded px-2 py-1 text-slate-100 text-xs focus:outline-none focus:border-teal-400"
            >
              {INSTRUMENT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id} className="bg-[#14171e]">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block mb-0.5">Chord Accompaniment Instrument</span>
            <select
              value={chordInstrument}
              onChange={(e) => onChordInstrumentChange(e.target.value as InstrumentType)}
              className="w-full bg-[#1a1f29] border border-[#2b3342] rounded px-2 py-1 text-slate-100 text-xs focus:outline-none focus:border-teal-400"
            >
              {INSTRUMENT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id} className="bg-[#14171e]">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Seed & Reproducibility with Auto-Roll vs Lock toggle */}
        <div className="bg-[#171b24] p-2.5 rounded-lg border border-[#252c3a]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Melody Seed
            </span>
            <div className="flex items-center gap-2">
              {onToggleAutoRollSeed && (
                <button
                  type="button"
                  onClick={onToggleAutoRollSeed}
                  title="When enabled, every click generates a completely fresh melody. When locked, uses current seed."
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium transition-colors ${
                    autoRollSeed
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {autoRollSeed ? '🎲 Auto-New' : '🔒 Locked'}
                </button>
              )}
              <button
                onClick={rollDiceSeed}
                title="Roll Random Seed"
                className="flex items-center gap-1 text-[10px] text-teal-400 hover:text-teal-300 font-mono"
              >
                <Dices className="w-3 h-3" />
                <span>Roll</span>
              </button>
            </div>
          </div>
          <input
            type="number"
            value={settings.seed}
            onChange={(e) => onSettingsChange({ ...settings, seed: Number(e.target.value) || 1 })}
            className="w-full bg-[#1a1f29] border border-[#2b3342] rounded px-2 py-1 font-mono text-slate-100 text-xs focus:outline-none focus:border-teal-400"
          />
          <p className="text-[9px] text-slate-400 mt-1">
            {autoRollSeed
              ? '✨ Fresh original melody generated on each click.'
              : '🔒 Locked: Exact reproducible melody from this seed number.'}
          </p>
        </div>

        {/* Collapsible Advanced Generation Settings */}
        <div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between py-1.5 px-2 bg-[#171b24] hover:bg-[#1c212c] rounded border border-[#252c3a] text-[11px] font-semibold text-slate-300 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              Detailed Algorithmic Weights
            </span>
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAdvanced && (
            <div className="mt-2 space-y-2.5 bg-[#171b24] p-3 rounded-lg border border-[#252c3a]">
              {/* Note Density */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>Note Density</span>
                  <span className="font-mono text-cyan-400">{settings.noteDensity}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={95}
                  value={settings.noteDensity}
                  onChange={(e) => onSettingsChange({ ...settings, noteDensity: Number(e.target.value) })}
                  className="w-full h-1 bg-slate-700 rounded appearance-none accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Repetition Amount */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>Motif Repetition</span>
                  <span className="font-mono text-cyan-400">{settings.repetitionAmount}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={90}
                  value={settings.repetitionAmount}
                  onChange={(e) => onSettingsChange({ ...settings, repetitionAmount: Number(e.target.value) })}
                  className="w-full h-1 bg-slate-700 rounded appearance-none accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Syncopation */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>Syncopation</span>
                  <span className="font-mono text-cyan-400">{settings.syncopationAmount}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={settings.syncopationAmount}
                  onChange={(e) => onSettingsChange({ ...settings, syncopationAmount: Number(e.target.value) })}
                  className="w-full h-1 bg-slate-700 rounded appearance-none accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Max Leap */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>Max Melodic Leap</span>
                  <span className="font-mono text-cyan-400">
                    {settings.maxLeap <= 4 ? '3rd (4 st)' : settings.maxLeap <= 7 ? '5th (7 st)' : 'Octave (12 st)'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[4, 7, 12].map((leap) => (
                    <button
                      key={leap}
                      onClick={() => onSettingsChange({ ...settings, maxLeap: leap })}
                      className={`py-1 text-[10px] rounded font-mono ${
                        settings.maxLeap === leap
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-[#1a1f29] border border-[#2b3342] text-slate-300'
                      }`}
                    >
                      {leap === 4 ? '3rd' : leap === 7 ? '5th' : 'Octave'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution Strength */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>Ending Resolution</span>
                  <span className="font-mono text-cyan-400">{settings.resolutionStrength}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={100}
                  value={settings.resolutionStrength}
                  onChange={(e) => onSettingsChange({ ...settings, resolutionStrength: Number(e.target.value) })}
                  className="w-full h-1 bg-slate-700 rounded appearance-none accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Phrase Length */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>Phrase Length</span>
                  <span className="font-mono text-cyan-400">{settings.phraseLengthBars} Bars</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[1, 2, 4].map((bars) => (
                    <button
                      key={bars}
                      onClick={() => onSettingsChange({ ...settings, phraseLengthBars: bars })}
                      className={`py-1 text-[10px] rounded font-mono ${
                        settings.phraseLengthBars === bars
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-[#1a1f29] border border-[#2b3342] text-slate-300'
                      }`}
                    >
                      {bars} {bars === 1 ? 'Bar' : 'Bars'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
