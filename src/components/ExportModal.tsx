/**
 * Export Modal:
 * Standards-compliant MIDI (SMF Type 1) export and high-fidelity WAV (16-bit PCM) audio rendering.
 */

import React, { useState } from 'react';
import { Note, Chord, InstrumentType } from '../types/music';
import { downloadMidiFile } from '../engine/midiExporter';
import { downloadWavFile, WavExportOptions } from '../engine/wavExporter';
import { X, Download, FileAudio, Music2, Check, Loader2 } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  chords: Chord[];
  bars: number;
  bpm: number;
  melodyInstrument: InstrumentType;
  chordInstrument: InstrumentType;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  notes,
  chords,
  bars,
  bpm,
  melodyInstrument,
  chordInstrument,
}) => {
  const [activeTab, setActiveTab] = useState<'midi' | 'wav'>('midi');
  const [wavMode, setWavMode] = useState<'full' | 'melody' | 'chords'>('full');
  const [sampleRate, setSampleRate] = useState<44100 | 48000>(44100);
  const [isRendering, setIsRendering] = useState(false);

  if (!isOpen) return null;

  const handleExportMidi = () => {
    downloadMidiFile(notes, chords, bpm, `chordmood_${bpm}bpm_${bars}bars.mid`);
    onClose();
  };

  const handleExportWav = async () => {
    setIsRendering(true);
    try {
      const options: WavExportOptions = {
        mode: wavMode,
        sampleRate,
        filename: `chordmood_${wavMode}_${bpm}bpm.wav`,
        melodyInstrument,
        chordInstrument,
      };
      await downloadWavFile(notes, chords, bars, bpm, options);
      onClose();
    } catch (err) {
      console.error('WAV export error:', err);
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none">
      <div className="bg-[#14171f] border border-[#2b3345] rounded-xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-[#252c3c] flex items-center justify-between bg-[#171b26]">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-teal-400" />
            <h3 className="font-bold text-slate-100 text-sm">
              Export Composition
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#252c3c] bg-[#10131a]">
          <button
            onClick={() => setActiveTab('midi')}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'midi'
                ? 'border-teal-400 text-teal-300 bg-[#161a24]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Music2 className="w-4 h-4" />
            <span>Standard MIDI (.mid)</span>
          </button>
          <button
            onClick={() => setActiveTab('wav')}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'wav'
                ? 'border-cyan-400 text-cyan-400 bg-[#161a24]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileAudio className="w-4 h-4" />
            <span>Rendered Audio (.wav)</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 space-y-4">
          {activeTab === 'midi' ? (
            <div className="space-y-3">
              <div className="bg-[#191e2b] p-3 rounded-lg border border-[#2a3345] text-xs space-y-2">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">MIDI Format:</span>
                  <span className="font-mono font-semibold text-teal-300">SMF Type 1 (Multi-Track)</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Tracks:</span>
                  <span className="font-mono text-slate-200">Track 0 (Conductor), Track 1 (Melody), Track 2 (Chords)</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Resolution (PPQ):</span>
                  <span className="font-mono text-slate-200">960 ticks per quarter</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Tempo / Signature:</span>
                  <span className="font-mono text-slate-200">{bpm} BPM · 4/4</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Notes Count:</span>
                  <span className="font-mono text-slate-200">{notes.length} Melody notes · {chords.length} Chords</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Compatible with FL Studio, Ableton Live, Logic Pro, Cubase, Reaper, and hardware synthesizers. Note pitches, velocities, delta-times, and separate channels are fully preserved.
              </p>

              <button
                onClick={handleExportMidi}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-300 hover:to-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-teal-500/20 transition-all active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>Download MIDI File (.mid)</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Render Mode */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Render Content
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'full', label: 'Full Song (Both)' },
                    { id: 'melody', label: 'Melody Only' },
                    { id: 'chords', label: 'Chords Only' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setWavMode(mode.id as 'full' | 'melody' | 'chords')}
                      className={`py-1.5 px-2 rounded text-xs font-medium text-center transition-colors ${
                        wavMode === mode.id
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-[#191e2b] border border-[#2b3345] text-slate-300 hover:text-white'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sample Rate */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Sample Rate
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { rate: 44100, label: '44.1 kHz (CD Quality)' },
                    { rate: 48000, label: '48.0 kHz (Studio Quality)' },
                  ].map((sr) => (
                    <button
                      key={sr.rate}
                      onClick={() => setSampleRate(sr.rate as 44100 | 48000)}
                      className={`py-1.5 px-2 rounded text-xs font-mono font-medium text-center transition-colors ${
                        sampleRate === sr.rate
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-[#191e2b] border border-[#2b3345] text-slate-300 hover:text-white'
                      }`}
                    >
                      {sr.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Audio Format Info */}
              <div className="bg-[#191e2b] p-3 rounded-lg border border-[#2a3345] text-xs space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Audio Format:</span>
                  <span className="font-mono text-cyan-300">16-Bit Linear PCM RIFF WAV</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Channels:</span>
                  <span className="font-mono text-slate-200">Stereo (2 Channels)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Instruments:</span>
                  <span className="font-mono text-slate-200">{melodyInstrument} + {chordInstrument}</span>
                </div>
              </div>

              <button
                onClick={handleExportWav}
                disabled={isRendering}
                className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all active:scale-98"
              >
                {isRendering ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Rendering Audio Buffer...</span>
                  </>
                ) : (
                  <>
                    <FileAudio className="w-4 h-4" />
                    <span>Render & Download WAV File</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
