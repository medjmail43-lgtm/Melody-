/**
 * Chord Recommendation Modal:
 * Displays alternative harmonic progressions analyzed from the current melody,
 * allows polyphonic auditioning, applying progressions, and generating melody over selected chords.
 */

import React from 'react';
import { Chord, ChordSuggestion } from '../types/music';
import { audioEngine } from '../engine/audioEngine';
import { Play, Check, Wand2, X, Sparkles, Music } from 'lucide-react';

interface ChordRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: ChordSuggestion[];
  currentChords: Chord[];
  onApplyProgression: (chords: Chord[]) => void;
  onGenerateMelodyOverChords: (chords: Chord[]) => void;
}

export const ChordRecommendationModal: React.FC<ChordRecommendationModalProps> = ({
  isOpen,
  onClose,
  suggestions,
  currentChords,
  onApplyProgression,
  onGenerateMelodyOverChords,
}) => {
  if (!isOpen) return null;

  const handleAudition = (chords: Chord[]) => {
    // Play entire progression sequence briefly
    audioEngine.play([], chords, chords.length, 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none">
      <div className="bg-[#14171f] border border-[#2b3345] rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-[#252c3c] flex items-center justify-between bg-[#171b26]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">
                Harmonic Progression Suggestions
              </h3>
              <p className="text-[11px] text-slate-400">
                Rule-based harmonic analysis recommending compatible chord progressions for your melody
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Heuristic Notice */}
        <div className="px-4 py-2 bg-teal-500/10 border-b border-teal-500/20 text-[11px] text-teal-300 leading-snug">
          <strong>Harmonic Note:</strong> Compatibility scores are internal music-theory heuristics calculating downbeat chord tone resonance, voice leading, and cadential strength rather than an absolute measure of artistic worth.
        </div>

        {/* Suggestion Cards List */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {suggestions.map((suggestion) => {
            return (
              <div
                key={suggestion.id}
                className="bg-[#1a1f2c] border border-[#2e3748] hover:border-cyan-500/50 rounded-lg p-3.5 transition-all flex flex-col gap-2.5"
              >
                {/* Title & Score */}
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-100 text-xs flex items-center gap-2">
                      {suggestion.name}
                      <span className="text-[10px] text-slate-400 font-normal">
                        · {suggestion.harmonicCharacter}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      {suggestion.description}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                      {suggestion.score}% Match
                    </span>
                  </div>
                </div>

                {/* Chords Sequence Badges */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  {suggestion.progression.map((chord, cIdx) => (
                    <div
                      key={chord.id || cIdx}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-950/50 border border-cyan-500/30 rounded text-xs"
                    >
                      <span className="font-bold text-cyan-300">{chord.symbol}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({chord.romanNumeral})
                      </span>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#262e3d]">
                  <button
                    onClick={() => handleAudition(suggestion.progression)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#252c3c] hover:bg-[#30384c] text-slate-200 text-xs font-medium transition-colors"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Audition</span>
                  </button>
                  <button
                    onClick={() => {
                      onApplyProgression(suggestion.progression);
                      onClose();
                    }}
                    className="flex items-center gap-1 px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    <span>Apply Progression</span>
                  </button>
                  <button
                    onClick={() => {
                      onGenerateMelodyOverChords(suggestion.progression);
                      onClose();
                    }}
                    className="flex items-center gap-1 px-3 py-1 rounded bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-300 hover:to-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-sm"
                  >
                    <Wand2 className="w-3 h-3 text-slate-950" />
                    <span>Generate Melody Over These</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
