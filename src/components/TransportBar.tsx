/**
 * Top Transport Bar:
 * Play, Pause, Stop, Loop, BPM stepper, Time Signature, Master Volume, Metronome,
 * Undo/Redo, Generate Melody, Regenerate, Export MIDI & WAV, Studio Guide.
 * Palette: Sleek bluish-green / teal / cyber-cyan (olo aesthetic).
 */

import React from 'react';
import {
  Play,
  Pause,
  Square,
  Repeat,
  Volume2,
  VolumeX,
  Undo2,
  Redo2,
  Wand2,
  RefreshCw,
  Download,
  CheckCircle2,
  Music2,
  BookOpen,
} from 'lucide-react';
import { TimeSignature } from '../types/music';

interface TransportBarProps {
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  timeSignature: TimeSignature;
  onTimeSignatureChange: (ts: TimeSignature) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  metronome: boolean;
  onToggleMetronome: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onGenerateMelody: () => void;
  onRegenerate: () => void;
  onOpenExport: () => void;
  onOpenTests: () => void;
  onOpenGuide: () => void;
  melodyMuted: boolean;
  onToggleMelodyMute: () => void;
  chordsMuted: boolean;
  onToggleChordsMute: () => void;
  activeMobileTab?: 'pianoroll' | 'generator';
  onMobileTabChange?: (tab: 'pianoroll' | 'generator') => void;
  autoRollSeed?: boolean;
  onToggleAutoRollSeed?: () => void;
  currentSeed?: number;
}

export const TransportBar: React.FC<TransportBarProps> = ({
  isPlaying,
  onPlay,
  onPause,
  onStop,
  isLooping,
  onToggleLoop,
  bpm,
  onBpmChange,
  timeSignature,
  onTimeSignatureChange,
  volume,
  onVolumeChange,
  isMuted,
  onToggleMute,
  metronome,
  onToggleMetronome,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onGenerateMelody,
  onRegenerate,
  onOpenExport,
  onOpenTests,
  onOpenGuide,
  melodyMuted,
  onToggleMelodyMute,
  chordsMuted,
  onToggleChordsMute,
  activeMobileTab = 'pianoroll',
  onMobileTabChange,
  autoRollSeed = true,
  onToggleAutoRollSeed,
  currentSeed,
}) => {
  return (
    <header className="h-14 bg-[#11141b] border-b border-[#1f2636] flex items-center justify-between px-2 sm:px-4 select-none shrink-0 gap-2 sm:gap-4 text-xs">
      {/* Zone 1: Brand & Logo + Mobile Tab Switcher */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-teal-400 via-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/25 text-slate-950 font-bold shrink-0">
            <Music2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-950" />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-bold text-slate-100 tracking-tight flex items-center gap-1">
              ChordMood
            </span>
            <span className="hidden sm:block text-[10px] text-teal-400/80 font-medium -mt-0.5 font-mono">
              Algorithmic Studio
            </span>
          </div>
        </div>

        {/* Mobile View Toggle (Visible on screens < lg) */}
        {onMobileTabChange && (
          <div className="flex lg:hidden items-center bg-[#171c26] border border-[#263145] rounded-lg p-0.5 ml-1">
            <button
              onClick={() => onMobileTabChange('pianoroll')}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                activeMobileTab === 'pianoroll'
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Piano Roll
            </button>
            <button
              onClick={() => onMobileTabChange('generator')}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                activeMobileTab === 'generator'
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Config
            </button>
          </div>
        )}
      </div>

      {/* Zone 2: Transport & Central Controls */}
      <div className="flex items-center gap-1 sm:gap-2 md:gap-3 shrink-0">
        {/* Playback Controls */}
        <div className="flex items-center bg-[#171c26] border border-[#263145] rounded-lg p-0.5 gap-0.5 shadow-sm">
          {isPlaying ? (
            <button
              onClick={onPause}
              title="Pause (Space)"
              className="p-1.5 rounded-md text-teal-300 bg-teal-400/15 hover:bg-teal-400/25 transition-colors"
            >
              <Pause className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={onPlay}
              title="Play (Space)"
              className="p-1.5 rounded-md text-slate-200 hover:text-teal-300 hover:bg-teal-500/10 transition-colors"
            >
              <Play className="w-4 h-4 fill-current" />
            </button>
          )}

          <button
            onClick={onStop}
            title="Stop & Reset to Start"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={onToggleLoop}
            title={isLooping ? 'Loop Enabled' : 'Loop Disabled'}
            className={`p-1.5 rounded-md transition-colors ${
              isLooping
                ? 'text-teal-300 bg-teal-500/15'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        {/* BPM Stepper */}
        <div className="flex items-center bg-[#171c26] border border-[#263145] rounded-lg px-2 py-1 gap-1.5 shadow-sm">
          <span className="text-[10px] text-teal-400/70 uppercase tracking-wider font-mono">BPM</span>
          <button
            onClick={() => onBpmChange(Math.max(40, bpm - 1))}
            className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 font-mono font-bold"
          >
            -
          </button>
          <input
            type="number"
            min={40}
            max={240}
            value={bpm}
            onChange={(e) => onBpmChange(Math.max(40, Math.min(240, Number(e.target.value) || 110)))}
            className="w-12 text-center bg-transparent font-mono font-semibold text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500/50 rounded"
          />
          <button
            onClick={() => onBpmChange(Math.min(240, bpm + 1))}
            className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 font-mono font-bold"
          >
            +
          </button>
        </div>

        {/* Time Signature */}
        <div className="hidden lg:flex items-center bg-[#171c26] border border-[#263145] rounded-lg px-2 py-1 gap-1.5 shadow-sm">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Time</span>
          <select
            value={`${timeSignature.numerator}/${timeSignature.denominator}`}
            onChange={(e) => {
              const [num, den] = e.target.value.split('/').map(Number);
              onTimeSignatureChange({ numerator: num, denominator: den });
            }}
            className="bg-transparent font-mono text-slate-200 text-xs focus:outline-none cursor-pointer"
          >
            <option value="4/4" className="bg-[#11141b]">4/4</option>
            <option value="3/4" className="bg-[#11141b]">3/4</option>
            <option value="6/8" className="bg-[#11141b]">6/8</option>
          </select>
        </div>

        {/* Metronome */}
        <button
          onClick={onToggleMetronome}
          title={metronome ? 'Metronome On' : 'Metronome Off'}
          className={`px-2 py-1.5 rounded-lg border text-xs font-mono font-medium transition-colors ${
            metronome
              ? 'border-teal-500/50 text-teal-300 bg-teal-500/15'
              : 'border-[#263145] text-slate-400 hover:text-slate-200 bg-[#171c26]'
          }`}
        >
          Metro
        </button>

        {/* Volume & Mute */}
        <div className="hidden sm:flex items-center bg-[#171c26] border border-[#263145] rounded-lg px-2 py-1 gap-1.5 shadow-sm">
          <button
            onClick={onToggleMute}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-teal-400" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-16 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-400"
          />
        </div>

        {/* Track Mutes */}
        <div className="hidden xl:flex items-center gap-1 bg-[#171c26] border border-[#263145] rounded-lg p-0.5">
          <button
            onClick={onToggleMelodyMute}
            title="Toggle Melody Audio"
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              melodyMuted
                ? 'bg-red-500/20 text-red-400 line-through'
                : 'text-teal-300 hover:bg-slate-800'
            }`}
          >
            Melody
          </button>
          <button
            onClick={onToggleChordsMute}
            title="Toggle Chords Audio"
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              chordsMuted
                ? 'bg-red-500/20 text-red-400 line-through'
                : 'text-cyan-300 hover:bg-slate-800'
            }`}
          >
            Chords
          </button>
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded-lg border border-[#263145] bg-[#171c26] text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1.5 rounded-lg border border-[#263145] bg-[#171c26] text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Zone 3: Generation & Export Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Guide button */}
        <button
          onClick={onOpenGuide}
          title="How to Use ChordMood Studio"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-teal-500/30 bg-teal-950/25 text-teal-300 hover:bg-teal-900/40 hover:border-teal-400/50 transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5 text-teal-400" />
          <span className="hidden sm:inline text-[11px] font-medium">Guide</span>
        </button>

        {/* Test Suite button */}
        <button
          onClick={onOpenTests}
          title="Run Automated Musical Engine Verification Tests"
          className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#263145] bg-[#171c26] text-slate-300 hover:text-teal-300 hover:border-teal-500/30 transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
          <span className="hidden lg:inline text-[11px] font-medium">Verify</span>
        </button>

        {/* Auto-Roll Seed Toggle / Current Seed */}
        {onToggleAutoRollSeed && (
          <button
            onClick={onToggleAutoRollSeed}
            title={autoRollSeed ? `Auto-Roll Seed ON: Every click generates a fresh original melody. (Current Seed: #${currentSeed}). Click to lock.` : `Seed Locked (#${currentSeed}): Melodies will use this exact seed. Click to auto-roll.`}
            className={`hidden xl:flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-mono transition-colors ${
              autoRollSeed
                ? 'border-teal-500/40 bg-teal-950/30 text-teal-300 hover:bg-teal-900/40'
                : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{autoRollSeed ? '🎲 Auto-New' : `🔒 #${currentSeed}`}</span>
          </button>
        )}

        {/* Regenerate with new seed */}
        <button
          onClick={onRegenerate}
          title="Roll a new seed and generate a fresh melody"
          className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-[#263145] bg-[#171c26] text-slate-300 hover:text-white hover:border-teal-500/40 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-teal-300" />
          <span className="hidden sm:inline text-[11px] font-medium">New Idea</span>
        </button>

        {/* Main Generate Melody CTA (Teal / Cyan-Emerald Glow) */}
        <button
          onClick={onGenerateMelody}
          className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-gradient-to-r from-teal-400 via-teal-500 to-cyan-500 hover:from-teal-300 hover:to-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/25 transition-all active:scale-95"
        >
          <Wand2 className="w-3.5 h-3.5 text-slate-950" />
          <span className="hidden sm:inline">Generate Melody</span>
          <span className="sm:hidden">Gen</span>
        </button>

        {/* Export Dropdown Trigger */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-teal-500/40 bg-teal-950/40 hover:bg-teal-900/50 text-teal-300 font-medium text-xs transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-teal-400" />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>
    </header>
  );
};
