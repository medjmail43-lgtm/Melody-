/**
 * ChordMood — Rule-Based Melody Generator
 * Main Application Component
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Note,
  Chord,
  Genre,
  MusicalKey,
  ScaleType,
  MoodPreset,
  MoodDimensions,
  GenerationSettings,
  InstrumentType,
  TimeSignature,
  ChordSuggestion,
} from './types/music';
import { GENRE_PROFILES } from './engine/genreProfiles';
import { MOOD_PRESETS } from './engine/moodEngine';
import { MelodyEngine } from './engine/melodyEngine';
import { ChordEngine } from './engine/chordEngine';
import { PRNG } from './engine/prng';
import { audioEngine } from './engine/audioEngine';
import { TransportBar } from './components/TransportBar';
import { GenerationPanel } from './components/GenerationPanel';
import { ChordLane } from './components/ChordLane';
import { PianoRoll, KEYBOARD_WIDTH } from './components/PianoRoll';
import { ChordRecommendationModal } from './components/ChordRecommendationModal';
import { ExportModal } from './components/ExportModal';
import { TestRunnerModal } from './components/TestRunnerModal';
import { GuideModal } from './components/GuideModal';

export default function App() {
  // Musical Settings State
  const [genre, setGenre] = useState<Genre>('Funk');
  const [bars, setBars] = useState<number>(4);
  const [musicalKey, setMusicalKey] = useState<MusicalKey>('C');
  const [scale, setScale] = useState<ScaleType>('dorian');
  const [bpm, setBpm] = useState<number>(108);
  const [timeSignature, setTimeSignature] = useState<TimeSignature>({ numerator: 4, denominator: 4 });
  const [moodPreset, setMoodPreset] = useState<MoodPreset | 'Custom'>('Happy');
  const [moodDimensions, setMoodDimensions] = useState<MoodDimensions>(MOOD_PRESETS['Happy']);

  // Auto-roll seed for generating fresh original melodies on every click
  const [autoRollSeed, setAutoRollSeed] = useState<boolean>(true);

  const [settings, setSettings] = useState<GenerationSettings>(() => {
    return {
      ...GENRE_PROFILES['Funk'].defaultSettings,
      seed: Math.floor(Math.random() * 900000) + 1000,
    };
  });

  // Instruments
  const [melodyInstrument, setMelodyInstrument] = useState<InstrumentType>('grand_piano');
  const [chordInstrument, setChordInstrument] = useState<InstrumentType>('warm_pad');

  // Generate initial composition synchronously on first load
  const [initialData] = useState(() => {
    const melodyEngine = new MelodyEngine();
    const chordEngine = new ChordEngine(new PRNG(42));
    const initialChords = chordEngine.generateProgression(4, 'C', 'dorian', 'Funk');
    const initialSettings = { ...GENRE_PROFILES['Funk'].defaultSettings, seed: 42 };

    const result = melodyEngine.generateMelody(
      4,
      'Funk',
      'C',
      'dorian',
      MOOD_PRESETS['Happy'],
      initialSettings,
      initialChords
    );

    return { notes: result.notes, chords: initialChords };
  });

  // Composition State
  const [notes, setNotes] = useState<Note[]>(() => initialData.notes);
  const [chords, setChords] = useState<Chord[]>(() => initialData.chords);

  // Undo / Redo History Stack
  const [history, setHistory] = useState<{ notes: Note[]; chords: Chord[] }[]>(() => [
    { notes: initialData.notes, chords: initialData.chords },
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentPlayheadTick, setCurrentPlayheadTick] = useState<number>(0);
  const currentPlayheadTickRef = useRef(0);
  currentPlayheadTickRef.current = currentPlayheadTick;

  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [metronome, setMetronome] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [melodyMuted, setMelodyMuted] = useState<boolean>(false);
  const [chordsMuted, setChordsMuted] = useState<boolean>(false);

  // Mobile View Tab Switcher ('pianoroll' | 'generator')
  const [activeMobileTab, setActiveMobileTab] = useState<'pianoroll' | 'generator'>('pianoroll');

  // Piano Roll Horizontal Scroll Left
  const [scrollLeft, setScrollLeft] = useState<number>(0);

  // Modals
  const [isChordModalOpen, setIsChordModalOpen] = useState<boolean>(false);
  const [chordSuggestions, setChordSuggestions] = useState<ChordSuggestion[]>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);

  // References to keep playhead callbacks updated
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const chordsRef = useRef(chords);
  chordsRef.current = chords;
  const barsRef = useRef(bars);
  barsRef.current = bars;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // Record action into undo history
  const pushHistory = useCallback((newNotes: Note[], newChords: Chord[]) => {
    setHistory(prev => {
      const upToCurrent = prev.slice(0, historyIndex + 1);
      return [...upToCurrent, { notes: newNotes, chords: newChords }].slice(-40); // Keep 40 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 39));
  }, [historyIndex]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const targetState = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setNotes(targetState.notes);
      setChords(targetState.chords);
    }
  }, [history, historyIndex]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetState = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setNotes(targetState.notes);
      setChords(targetState.chords);
    }
  }, [history, historyIndex]);

  // Note edits coming from Piano Roll
  const handleNotesChange = useCallback((updatedNotes: Note[], recordHistory: boolean = false) => {
    setNotes(updatedNotes);
    if (recordHistory) {
      pushHistory(updatedNotes, chordsRef.current);
    }
  }, [pushHistory]);

  // Core Melody Generation Function: Automatically provides fresh melodies or exact seed
  const generateNewMelody = useCallback((userChords?: Chord[], overrideSeed?: number) => {
    let activeSeed = settings.seed;
    if (overrideSeed !== undefined) {
      activeSeed = overrideSeed;
    } else if (autoRollSeed) {
      activeSeed = Math.floor(Math.random() * 900000) + 1000;
      setSettings(prev => ({ ...prev, seed: activeSeed }));
    }

    const melodyEngine = new MelodyEngine();
    const chordEngine = new ChordEngine(new PRNG(activeSeed));

    // Either use existing chords or generate harmonic progression
    const activeChords = userChords && userChords.length > 0
      ? userChords
      : chordEngine.generateProgression(bars, musicalKey, scale, genre);

    const activeSettings = { ...settings, seed: activeSeed };

    const result = melodyEngine.generateMelody(
      bars,
      genre,
      musicalKey,
      scale,
      moodDimensions,
      activeSettings,
      activeChords
    );

    setNotes(result.notes);
    setChords(activeChords);
    pushHistory(result.notes, activeChords);

    // If audio is playing, restart playback cleanly with new notes
    if (isPlayingRef.current) {
      audioEngine.play(result.notes, activeChords, bars, currentPlayheadTickRef.current);
    }
  }, [bars, genre, musicalKey, scale, moodDimensions, settings, autoRollSeed, pushHistory]);

  // Regenerate with random seed
  const handleRegenerate = useCallback(() => {
    const newSeed = Math.floor(Math.random() * 900000) + 1000;
    setSettings(prev => ({ ...prev, seed: newSeed }));
    generateNewMelody(undefined, newSeed);
  }, [generateNewMelody]);

  // Generate melody strictly over chosen chords
  const handleGenerateOverChords = useCallback((chosenChords: Chord[]) => {
    generateNewMelody(chosenChords);
  }, [generateNewMelody]);

  // Sync Audio Engine settings
  useEffect(() => {
    audioEngine.setBpm(bpm);
  }, [bpm]);

  useEffect(() => {
    audioEngine.setLooping(isLooping);
  }, [isLooping]);

  useEffect(() => {
    audioEngine.setMetronome(metronome);
  }, [metronome]);

  useEffect(() => {
    audioEngine.setVolume(isMuted ? 0 : volume);
  }, [volume, isMuted]);

  useEffect(() => {
    audioEngine.melodyInstrument = melodyInstrument;
  }, [melodyInstrument]);

  useEffect(() => {
    audioEngine.chordInstrument = chordInstrument;
  }, [chordInstrument]);

  useEffect(() => {
    audioEngine.setMelodyMuted(melodyMuted);
  }, [melodyMuted]);

  useEffect(() => {
    audioEngine.setChordsMuted(chordsMuted);
  }, [chordsMuted]);

  // Subscribe to Audio Engine Playhead and State
  useEffect(() => {
    audioEngine.subscribePlayhead((tick) => {
      setCurrentPlayheadTick(tick);
    });

    audioEngine.subscribePlaybackState((playing) => {
      setIsPlaying(playing);
    });
  }, []);

  // Transport Handlers
  const handlePlay = useCallback(() => {
    audioEngine.play(notesRef.current, chordsRef.current, barsRef.current, currentPlayheadTick);
  }, [currentPlayheadTick]);

  const handlePause = useCallback(() => {
    audioEngine.pause(currentPlayheadTick);
  }, [currentPlayheadTick]);

  const handleStop = useCallback(() => {
    audioEngine.stop();
    setCurrentPlayheadTick(0);
  }, []);

  const handleSeek = useCallback((tick: number) => {
    setCurrentPlayheadTick(tick);
    if (isPlayingRef.current) {
      audioEngine.play(notesRef.current, chordsRef.current, barsRef.current, tick);
    }
  }, []);

  // Open Chord Suggestions modal and run analyzer
  const handleOpenChordSuggestions = () => {
    const chordEngine = new ChordEngine(new PRNG(settings.seed));
    const suggestions = chordEngine.recommendProgressionsForMelody(
      notes,
      bars,
      musicalKey,
      scale,
      genre
    );
    setChordSuggestions(suggestions);
    setIsChordModalOpen(true);
  };

  // Keyboard shortcut listener for Space (play/pause), Ctrl+Z (undo), Ctrl+Y (redo)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlayingRef.current) {
          handlePause();
        } else {
          handlePlay();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handlePause, handlePlay, handleRedo, handleUndo]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0a1114] text-slate-200">
      {/* 1. Top Transport Bar */}
      <TransportBar
        isPlaying={isPlaying}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        isLooping={isLooping}
        onToggleLoop={() => setIsLooping(!isLooping)}
        bpm={bpm}
        onBpmChange={setBpm}
        timeSignature={timeSignature}
        onTimeSignatureChange={setTimeSignature}
        volume={volume}
        onVolumeChange={setVolume}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(!isMuted)}
        metronome={metronome}
        onToggleMetronome={() => setMetronome(!metronome)}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onGenerateMelody={() => generateNewMelody()}
        onRegenerate={handleRegenerate}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenTests={() => setIsTestModalOpen(true)}
        onOpenGuide={() => setIsGuideModalOpen(true)}
        melodyMuted={melodyMuted}
        onToggleMelodyMute={() => setMelodyMuted(!melodyMuted)}
        chordsMuted={chordsMuted}
        onToggleChordsMute={() => setChordsMuted(!chordsMuted)}
        activeMobileTab={activeMobileTab}
        onMobileTabChange={setActiveMobileTab}
        autoRollSeed={autoRollSeed}
        onToggleAutoRollSeed={() => setAutoRollSeed(!autoRollSeed)}
        currentSeed={settings.seed}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Generation & Musical Parameters Panel */}
        <div className={`h-full ${activeMobileTab === 'generator' ? 'w-full flex' : 'hidden lg:flex'}`}>
          <GenerationPanel
            genre={genre}
            onGenreChange={setGenre}
            bars={bars}
            onBarsChange={(newBars) => {
              setBars(newBars);
              // Re-extend or trim chords and regenerate melody
              const chordEngine = new ChordEngine(new PRNG(settings.seed));
              const newChords = chordEngine.generateProgression(newBars, musicalKey, scale, genre);
              generateNewMelody(newChords);
            }}
            musicalKey={musicalKey}
            onMusicalKeyChange={setMusicalKey}
            scale={scale}
            onScaleChange={setScale}
            moodPreset={moodPreset}
            onMoodPresetChange={setMoodPreset}
            moodDimensions={moodDimensions}
            onMoodDimensionsChange={setMoodDimensions}
            settings={settings}
            onSettingsChange={setSettings}
            melodyInstrument={melodyInstrument}
            onMelodyInstrumentChange={setMelodyInstrument}
            chordInstrument={chordInstrument}
            onChordInstrumentChange={setChordInstrument}
            autoRollSeed={autoRollSeed}
            onToggleAutoRollSeed={() => setAutoRollSeed(!autoRollSeed)}
            onApplyAndGenerate={() => {
              generateNewMelody();
              setActiveMobileTab('pianoroll');
            }}
          />
        </div>

        {/* Center / Right Piano Roll & Chord Lane Workspace */}
        <div className={`flex-1 flex-col h-full overflow-hidden bg-[#0d161a] ${activeMobileTab === 'pianoroll' ? 'flex' : 'hidden lg:flex'}`}>
          {/* Chord Lane directly above Piano Roll */}
          <ChordLane
            chords={chords}
            bars={bars}
            pixelsPerTick={0.08}
            keyboardWidth={KEYBOARD_WIDTH}
            onOpenChordSuggestions={handleOpenChordSuggestions}
            scrollLeft={scrollLeft}
          />

          {/* FL Studio Inspired Professional Piano Roll */}
          <PianoRoll
            notes={notes}
            onNotesChange={handleNotesChange}
            chords={chords}
            bars={bars}
            musicalKey={musicalKey}
            scale={scale}
            currentPlayheadTick={currentPlayheadTick}
            onSeek={handleSeek}
            isPlaying={isPlaying}
            scrollLeft={scrollLeft}
            onScrollLeftChange={setScrollLeft}
          />
        </div>
      </div>


      {/* 3. Chord Suggestions Modal */}
      <ChordRecommendationModal
        isOpen={isChordModalOpen}
        onClose={() => setIsChordModalOpen(false)}
        suggestions={chordSuggestions}
        currentChords={chords}
        onApplyProgression={(newChords) => {
          setChords(newChords);
          pushHistory(notes, newChords);
        }}
        onGenerateMelodyOverChords={(chosenChords) => {
          handleGenerateOverChords(chosenChords);
        }}
      />

      {/* 4. Export Modal (MIDI & WAV) */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        notes={notes}
        chords={chords}
        bars={bars}
        bpm={bpm}
        melodyInstrument={melodyInstrument}
        chordInstrument={chordInstrument}
      />

      {/* 5. Automated Test Suite Modal */}
      <TestRunnerModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
      />

      {/* 6. Studio Guide Modal */}
      <GuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />
    </div>
  );
}
