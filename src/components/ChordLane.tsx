/**
 * Chord Lane:
 * Displays harmonic progression directly above the Piano Roll timeline.
 * Aligns with bars and beats, allows chord auditioning and suggestion recommendations.
 */

import React from 'react';
import { Chord, TICKS_PER_QUARTER } from '../types/music';
import { audioEngine } from '../engine/audioEngine';
import { Sparkles, Music, Volume2 } from 'lucide-react';

interface ChordLaneProps {
  chords: Chord[];
  bars: number;
  pixelsPerTick: number;
  keyboardWidth: number;
  onOpenChordSuggestions: () => void;
  scrollLeft: number;
}

export const ChordLane: React.FC<ChordLaneProps> = ({
  chords,
  bars,
  pixelsPerTick,
  keyboardWidth,
  onOpenChordSuggestions,
  scrollLeft,
}) => {
  const ticksPerBar = 4 * TICKS_PER_QUARTER;

  const handleAuditionChord = (chord: Chord) => {
    audioEngine.playChordPreview(chord, 1.2);
  };

  return (
    <div className="h-10 bg-[#161a22] border-b border-[#252c3a] flex items-center shrink-0 select-none overflow-hidden text-xs">
      {/* Left label matching keyboard width */}
      <div
        style={{ width: keyboardWidth }}
        className="h-full border-r border-[#252c3a] flex items-center justify-between px-2 bg-[#13161d] shrink-0 z-10 shadow-sm"
      >
        <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 flex items-center gap-1">
          <Music className="w-3 h-3" />
          Chords
        </span>
        <button
          onClick={onOpenChordSuggestions}
          title="Open Chord Progressions & Harmonic Suggestions"
          className="flex items-center gap-1 text-[10px] text-teal-400 hover:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 px-1.5 py-0.5 rounded transition-colors"
        >
          <Sparkles className="w-2.5 h-2.5" />
          <span>Suggest</span>
        </button>
      </div>

      {/* Chords timeline area */}
      <div className="relative h-full flex-1 overflow-hidden">
        <div
          className="absolute top-0 bottom-0 left-0 h-full flex items-center"
          style={{ transform: `translateX(-${scrollLeft}px)` }}
        >
          {chords.map((chord) => {
            const left = chord.startTick * pixelsPerTick;
            const width = Math.max(30, chord.durationTicks * pixelsPerTick);

            return (
              <div
                key={chord.id}
                onClick={() => handleAuditionChord(chord)}
                style={{ left, width }}
                title={`Click to audition ${chord.symbol} (${chord.romanNumeral})`}
                className="absolute top-1 bottom-1 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 hover:border-cyan-400 rounded cursor-pointer flex items-center justify-between px-2.5 group transition-all"
              >
                <div className="flex items-baseline gap-1.5 overflow-hidden">
                  <span className="font-bold text-cyan-300 text-xs tracking-tight">
                    {chord.symbol}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {chord.romanNumeral}
                  </span>
                </div>
                <Volume2 className="w-3 h-3 text-cyan-400/50 group-hover:text-cyan-300 shrink-0" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
