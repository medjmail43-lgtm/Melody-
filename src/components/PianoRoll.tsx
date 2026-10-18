/**
 * Professional FL Studio Inspired Piano Roll
 * Features:
 * - Interactive vertical Piano Keyboard with auditioning & active key illumination
 * - Dark charcoal aesthetic with alternating key lanes and octave separators
 * - Scale highlighting (in-scale rows illuminated, out-of-scale dimmed)
 * - Ghost notes toggle (showing chord tones faintly in background)
 * - Timeline with bar numbers and beat subdivisions
 * - Note editing: click-to-draw, horizontal/vertical drag (pitch & time), edge resize, marquee select, duplicate, delete
 * - Snapping options: 1 Bar, 1/2 Bar, 1/4, 1/8, 1/16, 1/32, Triplets, Free
 * - Velocity lane beneath the note grid with interactive stems
 * - Horizontal and vertical zoom & minimap navigation
 * - Synchronous moving playback playhead
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Note,
  Chord,
  MusicalKey,
  ScaleType,
  PianoRollTool,
  SnapOption,
  TICKS_PER_QUARTER,
} from '../types/music';
import {
  isNoteInScale,
  midiToNoteName,
  NOTE_NAMES,
} from '../engine/musicTheory';
import { audioEngine } from '../engine/audioEngine';
import {
  Pencil,
  MousePointer,
  Paintbrush,
  Eraser,
  Wand2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  Sliders,
  Copy,
  Trash2,
  Grid,
} from 'lucide-react';

interface PianoRollProps {
  notes: Note[];
  onNotesChange: (notes: Note[], recordHistory?: boolean) => void;
  chords: Chord[];
  bars: number;
  musicalKey: MusicalKey;
  scale: ScaleType;
  currentPlayheadTick: number;
  onSeek: (tick: number) => void;
  isPlaying: boolean;
  scrollLeft: number;
  onScrollLeftChange: (scrollLeft: number) => void;
}

// Pitch range: C2 (36) to B6 (95) - 60 semitones
const MIN_MIDI = 36; // C2
const MAX_MIDI = 95; // B6
const TOTAL_PITCHES = MAX_MIDI - MIN_MIDI + 1; // 60 pitches

export const KEYBOARD_WIDTH = 64; // px

export const PianoRoll: React.FC<PianoRollProps> = ({
  notes,
  onNotesChange,
  chords,
  bars,
  musicalKey,
  scale,
  currentPlayheadTick,
  onSeek,
  isPlaying,
  scrollLeft,
  onScrollLeftChange,
}) => {
  // Tools & Settings
  const [tool, setTool] = useState<PianoRollTool>('draw');
  const [snap, setSnap] = useState<SnapOption>('1_16');
  const [scaleHighlight, setScaleHighlight] = useState(true);
  const [ghostNotes, setGhostNotes] = useState(true);
  const [showVelocityLane, setShowVelocityLane] = useState(true);

  // Zoom & Dimensions
  const [zoomX, setZoomX] = useState(1.0); // 1.0 = ~0.08 px/tick (approx 76.8 px per quarter note)
  const [zoomY, setZoomY] = useState(1.0); // row height = 18px * zoomY

  const baseRowHeight = 18;
  const rowHeight = Math.max(12, Math.round(baseRowHeight * zoomY));
  const basePixelsPerTick = 0.08;
  const pixelsPerTick = basePixelsPerTick * zoomX;

  const ticksPerBar = 4 * TICKS_PER_QUARTER; // 3840
  const totalTicks = bars * ticksPerBar;
  const gridWidth = Math.max(600, totalTicks * pixelsPerTick);
  const gridHeight = TOTAL_PITCHES * rowHeight;

  // User key preview auditioning
  const [clickedPitches, setClickedPitches] = useState<Set<number>>(new Set());

  // Derive sounding pitches directly from playback and user clicks (no setState inside useEffect!)
  const soundingPitches = useMemo(() => {
    const pitches = new Set<number>(clickedPitches);
    if (isPlaying) {
      for (const n of notes) {
        if (currentPlayheadTick >= n.startTick && currentPlayheadTick < n.startTick + n.durationTicks) {
          pitches.add(n.midi);
        }
      }
    }
    return pitches;
  }, [clickedPitches, isPlaying, notes, currentPlayheadTick]);

  // Refs for scrolling container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const velocityContainerRef = useRef<HTMLDivElement>(null);

  // Interaction State
  const [isInteracting, setIsInteracting] = useState(false);
  const [dragState, setDragState] = useState<{
    mode: 'move' | 'resize-start' | 'resize-end' | 'marquee' | 'velocity';
    startX: number;
    startY: number;
    initialNotes: Note[];
    targetNoteId?: string;
    marqueeBox?: { startX: number; startY: number; currentX: number; currentY: number };
  } | null>(null);

  // Convert snap option to ticks
  const getSnapTicks = useCallback((): number => {
    switch (snap) {
      case '1_bar': return ticksPerBar;
      case '1_2_bar': return ticksPerBar / 2;
      case '1_4': return TICKS_PER_QUARTER;
      case '1_8': return TICKS_PER_QUARTER / 2;
      case '1_16': return TICKS_PER_QUARTER / 4;
      case '1_32': return TICKS_PER_QUARTER / 8;
      case '1_8T': return Math.round((TICKS_PER_QUARTER * 2) / 3);
      case '1_16T': return Math.round(TICKS_PER_QUARTER / 3);
      case 'off': return 1;
      default: return TICKS_PER_QUARTER / 4;
    }
  }, [snap, ticksPerBar]);

  // Snap a tick value to grid
  const snapTick = useCallback((tick: number): number => {
    const snapT = getSnapTicks();
    if (snapT <= 1) return Math.max(0, Math.round(tick));
    return Math.max(0, Math.round(tick / snapT) * snapT);
  }, [getSnapTicks]);

  // Y coordinate to MIDI note
  const yToMidi = useCallback((y: number): number => {
    const row = Math.floor(y / rowHeight);
    const midi = MAX_MIDI - row;
    return Math.max(MIN_MIDI, Math.min(MAX_MIDI, midi));
  }, [rowHeight]);

  // MIDI note to Y coordinate
  const midiToY = useCallback((midi: number): number => {
    const row = MAX_MIDI - midi;
    return row * rowHeight;
  }, [rowHeight]);

  // Scroll sync handler
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const left = scrollContainerRef.current.scrollLeft;
      onScrollLeftChange(left);
      if (velocityContainerRef.current) {
        velocityContainerRef.current.scrollLeft = left;
      }
    }
  };

  // Keyboard Audition Click
  const handleKeyClick = (midi: number) => {
    audioEngine.playNotePreview(midi, 0.4);
    setClickedPitches(prev => new Set([...prev, midi]));
    setTimeout(() => {
      setClickedPitches(prev => {
        const next = new Set(prev);
        next.delete(midi);
        return next;
      });
    }, 400);
  };

  // --- Note Manipulation Handlers ---

  // Handle clicking on empty grid area
  const handleGridMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only left-click
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const clickedMidi = yToMidi(clickY);
    const clickedTick = snapTick(clickX / pixelsPerTick);

    if (tool === 'select') {
      // Start marquee selection
      setDragState({
        mode: 'marquee',
        startX: clickX,
        startY: clickY,
        initialNotes: notes.map(n => ({ ...n })),
        marqueeBox: { startX: clickX, startY: clickY, currentX: clickX, currentY: clickY },
      });
      setIsInteracting(true);
      return;
    }

    if (tool === 'draw' || tool === 'paint') {
      // Create new note
      const defaultDuration = getSnapTicks() > 1 ? getSnapTicks() : TICKS_PER_QUARTER / 4;
      const newNote: Note = {
        id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        midi: clickedMidi,
        startTick: clickedTick,
        durationTicks: defaultDuration,
        velocity: 100,
        selected: true,
      };

      // Audition note immediately
      audioEngine.playNotePreview(clickedMidi, 0.3, 100);

      // Deselect others unless shift is held
      const updatedNotes = e.shiftKey
        ? [...notes, newNote]
        : [...notes.map(n => ({ ...n, selected: false })), newNote];

      onNotesChange(updatedNotes, true);

      // Start drag move for this newly created note
      setDragState({
        mode: 'move',
        startX: clickX,
        startY: clickY,
        initialNotes: updatedNotes,
        targetNoteId: newNote.id,
      });
      setIsInteracting(true);
    }
  };

  // Note element mouse down (Move, Resize, Delete, Select)
  const handleNoteMouseDown = (e: React.MouseEvent, note: Note, resizeEdge?: 'start' | 'end') => {
    e.stopPropagation();
    if (e.button !== 0) return;

    if (tool === 'delete') {
      const remaining = notes.filter(n => n.id !== note.id);
      onNotesChange(remaining, true);
      return;
    }

    // Selection logic
    let updatedNotes = [...notes];
    if (e.shiftKey) {
      // Toggle selection
      updatedNotes = updatedNotes.map(n => (n.id === note.id ? { ...n, selected: !n.selected } : n));
    } else if (!note.selected) {
      // Select only this note
      updatedNotes = updatedNotes.map(n => ({ ...n, selected: n.id === note.id }));
    }

    onNotesChange(updatedNotes, false);

    // Audition note
    audioEngine.playNotePreview(note.midi, 0.25, note.velocity);

    const clientX = e.clientX;
    const clientY = e.clientY;

    if (resizeEdge) {
      setDragState({
        mode: resizeEdge === 'end' ? 'resize-end' : 'resize-start',
        startX: clientX,
        startY: clientY,
        initialNotes: updatedNotes.map(n => ({ ...n })),
        targetNoteId: note.id,
      });
    } else {
      setDragState({
        mode: 'move',
        startX: clientX,
        startY: clientY,
        initialNotes: updatedNotes.map(n => ({ ...n })),
        targetNoteId: note.id,
      });
    }

    setIsInteracting(true);
  };

  // Keep refs for dragging interactions to avoid dependency cycles and re-subscribing
  const dragStateRef = useRef(dragState);
  dragStateRef.current = dragState;
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const onNotesChangeRef = useRef(onNotesChange);
  onNotesChangeRef.current = onNotesChange;

  // Global mouse move during interaction
  useEffect(() => {
    if (!isInteracting) return;

    const handleMouseMove = (e: MouseEvent) => {
      const activeDrag = dragStateRef.current;
      if (!activeDrag) return;

      const deltaX = (e.clientX - activeDrag.startX) / pixelsPerTick;
      const snapT = getSnapTicks();
      const snappedDeltaTicks = snapT > 1 ? Math.round(deltaX / snapT) * snapT : Math.round(deltaX);

      const deltaRow = Math.round((e.clientY - activeDrag.startY) / rowHeight);
      const semitoneDelta = -deltaRow;

      if (activeDrag.mode === 'move') {
        const selectedIds = new Set(
          activeDrag.initialNotes.filter(n => n.selected).map(n => n.id)
        );
        if (activeDrag.targetNoteId) selectedIds.add(activeDrag.targetNoteId);

        const updated = activeDrag.initialNotes.map(n => {
          if (!selectedIds.has(n.id)) return n;
          const newStart = Math.max(0, n.startTick + snappedDeltaTicks);
          const newMidi = Math.max(MIN_MIDI, Math.min(MAX_MIDI, n.midi + semitoneDelta));
          return { ...n, startTick: newStart, midi: newMidi };
        });

        onNotesChangeRef.current(updated, false);
      } else if (activeDrag.mode === 'resize-end') {
        const updated = activeDrag.initialNotes.map(n => {
          if (n.id !== activeDrag.targetNoteId) return n;
          const newDuration = Math.max(
            snapT > 1 ? snapT : 120,
            n.durationTicks + snappedDeltaTicks
          );
          return { ...n, durationTicks: newDuration };
        });
        onNotesChangeRef.current(updated, false);
      } else if (activeDrag.mode === 'resize-start') {
        const updated = activeDrag.initialNotes.map(n => {
          if (n.id !== activeDrag.targetNoteId) return n;
          const maxStart = n.startTick + n.durationTicks - (snapT > 1 ? snapT : 120);
          const newStart = Math.min(maxStart, Math.max(0, n.startTick + snappedDeltaTicks));
          const newDuration = n.durationTicks + (n.startTick - newStart);
          return { ...n, startTick: newStart, durationTicks: newDuration };
        });
        onNotesChangeRef.current(updated, false);
      } else if (activeDrag.mode === 'marquee') {
        const currentX = e.clientX - (scrollContainerRef.current?.getBoundingClientRect().left || 0) + (scrollContainerRef.current?.scrollLeft || 0);
        const currentY = e.clientY - (scrollContainerRef.current?.getBoundingClientRect().top || 0);

        const x1 = Math.min(activeDrag.startX, currentX);
        const x2 = Math.max(activeDrag.startX, currentX);
        const y1 = Math.min(activeDrag.startY, currentY);
        const y2 = Math.max(activeDrag.startY, currentY);

        const updated = activeDrag.initialNotes.map(n => {
          const noteLeft = n.startTick * pixelsPerTick;
          const noteRight = noteLeft + n.durationTicks * pixelsPerTick;
          const noteTop = midiToY(n.midi);
          const noteBottom = noteTop + rowHeight;

          const inMarquee = !(noteRight < x1 || noteLeft > x2 || noteBottom < y1 || noteTop > y2);
          return { ...n, selected: inMarquee };
        });

        setDragState(prev => prev ? {
          ...prev,
          marqueeBox: { startX: prev.startX, startY: prev.startY, currentX, currentY },
        } : null);

        onNotesChangeRef.current(updated, false);
      }
    };

    const handleMouseUp = () => {
      setIsInteracting(false);
      setDragState(null);
      // Commit final state to undo history
      onNotesChangeRef.current(notesRef.current, true);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isInteracting, pixelsPerTick, rowHeight, getSnapTicks, midiToY]);

  // Velocity stem dragging
  const handleVelocityMouseDown = (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    const startY = e.clientY;
    const initialVel = note.velocity;

    const handleVelMove = (moveEv: MouseEvent) => {
      const deltaY = startY - moveEv.clientY;
      const newVel = Math.max(1, Math.min(127, Math.round(initialVel + deltaY * 1.5)));
      const updated = notes.map(n => (n.id === note.id ? { ...n, velocity: newVel } : n));
      onNotesChange(updated, false);
    };

    const handleVelUp = () => {
      window.removeEventListener('mousemove', handleVelMove);
      window.removeEventListener('mouseup', handleVelUp);
      onNotesChange(notes, true);
    };

    window.addEventListener('mousemove', handleVelMove);
    window.addEventListener('mouseup', handleVelUp);
  };

  // Keyboard shortcut actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const remaining = notes.filter(n => !n.selected);
        if (remaining.length !== notes.length) {
          onNotesChange(remaining, true);
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        // Duplicate selected notes forward by current snap
        const selected = notes.filter(n => n.selected);
        if (selected.length > 0) {
          const snapT = getSnapTicks() > 1 ? getSnapTicks() : TICKS_PER_QUARTER;
          const duplicates = selected.map(n => ({
            ...n,
            id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            startTick: n.startTick + snapT,
            selected: true,
          }));
          const unselected = notes.map(n => ({ ...n, selected: false }));
          onNotesChange([...unselected, ...duplicates], true);
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        onNotesChange(notes.map(n => ({ ...n, selected: true })), false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [getSnapTicks, notes, onNotesChange]);

  // Quantize selected or all notes
  const handleQuantize = () => {
    const snapT = getSnapTicks() > 1 ? getSnapTicks() : TICKS_PER_QUARTER / 4;
    const hasSelection = notes.some(n => n.selected);
    const updated = notes.map(n => {
      if (hasSelection && !n.selected) return n;
      const quantizedStart = Math.round(n.startTick / snapT) * snapT;
      const quantizedDuration = Math.max(snapT, Math.round(n.durationTicks / snapT) * snapT);
      return { ...n, startTick: quantizedStart, durationTicks: quantizedDuration };
    });
    onNotesChange(updated, true);
  };

  // Duplicate Selected button
  const handleDuplicateSelected = () => {
    const selected = notes.filter(n => n.selected);
    if (selected.length === 0) return;
    const snapT = getSnapTicks() > 1 ? getSnapTicks() : TICKS_PER_QUARTER;
    const duplicates = selected.map(n => ({
      ...n,
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      startTick: n.startTick + snapT,
      selected: true,
    }));
    const unselected = notes.map(n => ({ ...n, selected: false }));
    onNotesChange([...unselected, ...duplicates], true);
  };

  // Delete Selected button
  const handleDeleteSelected = () => {
    const remaining = notes.filter(n => !n.selected);
    onNotesChange(remaining, true);
  };

  // Timeline bar numbers & beat divisions
  const totalBeats = bars * 4;
  const barDivisionElements: React.JSX.Element[] = [];
  for (let b = 0; b < totalBeats; b++) {
    const isBar = b % 4 === 0;
    const barNumber = Math.floor(b / 4) + 1;
    const left = b * TICKS_PER_QUARTER * pixelsPerTick;

    barDivisionElements.push(
      <div
        key={`beat-${b}`}
        style={{ left }}
        className={`absolute top-0 bottom-0 pointer-events-none ${
          isBar ? 'border-l border-[#3a4459]' : 'border-l border-[#222836]'
        }`}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#13161c] overflow-hidden select-none">
      {/* Piano Roll Toolbar */}
      <div className="h-10 bg-[#161a22] border-b border-[#252c3a] flex items-center justify-between px-2 sm:px-3 shrink-0 text-xs overflow-x-auto gap-2">
        {/* Tool Segmented Buttons */}
        <div className="flex items-center gap-1 bg-[#1a1f29] border border-[#2b3342] rounded-lg p-0.5 shrink-0">
          <button
            onClick={() => setTool('draw')}
            title="Draw Tool (Click to add, drag to move)"
            className={`p-1.5 rounded transition-colors ${
              tool === 'draw' ? 'bg-teal-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTool('select')}
            title="Select Tool (Marquee box selection)"
            className={`p-1.5 rounded transition-colors ${
              tool === 'select' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <MousePointer className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTool('paint')}
            title="Paint Tool (Sequence brushes)"
            className={`p-1.5 rounded transition-colors ${
              tool === 'paint' ? 'bg-teal-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Paintbrush className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTool('delete')}
            title="Eraser Tool (Click notes to delete)"
            className={`p-1.5 rounded transition-colors ${
              tool === 'delete' ? 'bg-red-500 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Snapping Selector */}
        <div className="flex items-center gap-1.5 bg-[#1a1f29] border border-[#2b3342] rounded-lg px-2 py-1 shrink-0">
          <Grid className="w-3 h-3 text-slate-400" />
          <span className="text-[10px] text-slate-400 uppercase font-mono">Snap</span>
          <select
            value={snap}
            onChange={(e) => setSnap(e.target.value as SnapOption)}
            className="bg-transparent font-mono text-slate-200 text-xs focus:outline-none cursor-pointer"
          >
            <option value="1_bar" className="bg-[#14171e]">1 Bar</option>
            <option value="1_2_bar" className="bg-[#14171e]">1/2 Bar</option>
            <option value="1_4" className="bg-[#14171e]">1/4 (Beat)</option>
            <option value="1_8" className="bg-[#14171e]">1/8 Note</option>
            <option value="1_16" className="bg-[#14171e]">1/16 Note</option>
            <option value="1_32" className="bg-[#14171e]">1/32 Note</option>
            <option value="1_8T" className="bg-[#14171e]">1/8 Triplet</option>
            <option value="1_16T" className="bg-[#14171e]">1/16 Triplet</option>
            <option value="off" className="bg-[#14171e]">Free / Off</option>
          </select>
        </div>

        {/* Viewport & Assistance Toggles */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Scale Highlighting Toggle */}
          <button
            onClick={() => setScaleHighlight(!scaleHighlight)}
            title="Toggle Scale Highlighting"
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
              scaleHighlight
                ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
                : 'border-[#2b3342] bg-[#1a1f29] text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span className="hidden sm:inline">Scale Lights</span>
          </button>

          {/* Ghost Notes Toggle */}
          <button
            onClick={() => setGhostNotes(!ghostNotes)}
            title="Toggle Ghost Chords in background"
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
              ghostNotes
                ? 'border-teal-500/50 bg-teal-500/10 text-teal-300'
                : 'border-[#2b3342] bg-[#1a1f29] text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="hidden sm:inline">Ghost Chords</span>
          </button>

          {/* Velocity Lane Toggle */}
          <button
            onClick={() => setShowVelocityLane(!showVelocityLane)}
            title="Toggle Velocity Editor Lane"
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
              showVelocityLane
                ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300'
                : 'border-[#2b3342] bg-[#1a1f29] text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3 h-3" />
            <span className="hidden sm:inline">Velocity</span>
          </button>

          {/* Quantize Action */}
          <button
            onClick={handleQuantize}
            title="Quantize notes to current grid snap"
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border border-[#2b3342] bg-[#1a1f29] text-slate-300 hover:text-white transition-colors"
          >
            <Wand2 className="w-3 h-3" />
            <span className="hidden md:inline">Quantize</span>
          </button>

          {/* Duplicate Action */}
          <button
            onClick={handleDuplicateSelected}
            title="Duplicate Selected Notes (Ctrl+D)"
            className="p-1 rounded text-slate-400 hover:text-slate-200 bg-[#1a1f29] border border-[#2b3342]"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* Delete Action */}
          <button
            onClick={handleDeleteSelected}
            title="Delete Selected Notes (Del)"
            className="p-1 rounded text-slate-400 hover:text-red-400 bg-[#1a1f29] border border-[#2b3342]"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center gap-0.5 bg-[#1a1f29] border border-[#2b3342] rounded-lg p-0.5 ml-1">
            <button
              onClick={() => setZoomX(prev => Math.max(0.4, prev * 0.85))}
              title="Zoom Out X"
              className="p-1 text-slate-400 hover:text-white rounded"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <button
              onClick={() => setZoomX(prev => Math.min(3.0, prev * 1.15))}
              title="Zoom In X"
              className="p-1 text-slate-400 hover:text-white rounded"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Piano Roll Workspace (Keyboard + Timeline Grid) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sticky Vertical Piano Keyboard on Left */}
        <div
          style={{ width: KEYBOARD_WIDTH }}
          className="h-full bg-[#111318] border-r border-[#252c3a] shrink-0 select-none overflow-hidden relative z-20 shadow-md"
        >
          {/* Top ruler spacer to align with horizontal timeline header */}
          <div className="h-6 bg-[#161a22] border-b border-[#252c3a] flex items-center justify-center text-[10px] font-mono text-slate-400">
            Keys
          </div>

          <div
            className="relative"
            style={{
              height: gridHeight,
              transform: `translateY(-${scrollContainerRef.current?.scrollTop || 0}px)`,
            }}
          >
            {Array.from({ length: TOTAL_PITCHES }).map((_, idx) => {
              const midi = MAX_MIDI - idx;
              const pc = ((midi % 12) + 12) % 12;
              const isBlackKey = [1, 3, 6, 8, 10].includes(pc);
              const noteName = midiToNoteName(midi);
              const isC = pc === 0;
              const isSounding = soundingPitches.has(midi);

              return (
                <div
                  key={`key-${midi}`}
                  onClick={() => handleKeyClick(midi)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleKeyClick(midi);
                  }}
                  style={{ height: rowHeight }}
                  className={`w-full border-b border-black/40 flex items-center justify-between px-1.5 cursor-pointer transition-colors ${
                    isSounding
                      ? 'bg-teal-400 text-slate-950 font-bold shadow-[0_0_8px_rgba(20,184,166,0.6)]'
                      : isBlackKey
                      ? 'bg-[#181a20] hover:bg-[#252833] text-slate-400'
                      : 'bg-[#eceff4] hover:bg-white text-slate-900 font-medium'
                  } ${isC ? 'border-b-2 border-teal-500/50' : ''}`}
                >
                  <span className={`text-[9px] font-mono leading-none ${isBlackKey ? 'text-slate-400' : 'text-slate-700 font-semibold'}`}>
                    {isC || isSounding ? noteName : isBlackKey ? '' : noteName.substring(0, 1)}
                  </span>
                  {isC && (
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrollable Timeline Grid Container */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 h-full overflow-auto relative bg-[#14171d]"
        >
          {/* Top Timeline Ruler Bar */}
          <div
            className="sticky top-0 h-6 bg-[#161a22] border-b border-[#252c3a] z-10 flex items-center select-none"
            style={{ width: gridWidth }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const seekTick = Math.max(0, Math.round(clickX / pixelsPerTick));
              onSeek(seekTick);
            }}
          >
            {Array.from({ length: bars }).map((_, barIdx) => {
              const left = barIdx * ticksPerBar * pixelsPerTick;
              return (
                <div
                  key={`bar-head-${barIdx}`}
                  style={{ left, width: ticksPerBar * pixelsPerTick }}
                  className="absolute top-0 bottom-0 border-l border-[#3a4459] px-1 flex items-center font-mono text-[10px] text-slate-400 hover:text-teal-400 cursor-pointer"
                >
                  <span className="font-semibold text-slate-300">{barIdx + 1}</span>
                  <div className="flex-1 flex justify-around opacity-40 text-[8px]">
                    <span>.2</span>
                    <span>.3</span>
                    <span>.4</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grid Canvas Area */}
          <div
            onMouseDown={handleGridMouseDown}
            style={{ width: gridWidth, height: gridHeight }}
            className="relative cursor-crosshair"
          >
            {/* Background Rows */}
            {Array.from({ length: TOTAL_PITCHES }).map((_, idx) => {
              const midi = MAX_MIDI - idx;
              const pc = ((midi % 12) + 12) % 12;
              const isBlackKey = [1, 3, 6, 8, 10].includes(pc);
              const inScale = isNoteInScale(midi, musicalKey, scale);
              const isC = pc === 0;

              // Row background color styling based on scale highlight
              let rowBg = isBlackKey ? 'bg-[#13161c]' : 'bg-[#181b24]';
              if (scaleHighlight) {
                if (inScale) {
                  rowBg = isBlackKey ? 'bg-[#18202d]' : 'bg-[#1b2535]';
                } else {
                  rowBg = 'bg-[#0f1116] opacity-90';
                }
              }

              return (
                <div
                  key={`row-${midi}`}
                  style={{ height: rowHeight }}
                  className={`w-full border-b border-[#1f2430]/60 ${rowBg} ${
                    isC ? 'border-b-[#3c4659] border-b-2' : ''
                  }`}
                />
              );
            })}

            {/* Vertical Bar & Beat Grid Lines */}
            {barDivisionElements}

            {/* Ghost Notes (Chord Tones rendered faintly in background) */}
            {ghostNotes && chords.map((chord) => {
              const chordLeft = chord.startTick * pixelsPerTick;
              const chordWidth = chord.durationTicks * pixelsPerTick;

              return chord.voicingNotes.map((pitch) => {
                if (pitch < MIN_MIDI || pitch > MAX_MIDI) return null;
                const top = midiToY(pitch);

                return (
                  <div
                    key={`ghost-${chord.id}-${pitch}`}
                    style={{
                      left: chordLeft,
                      top: top + 1,
                      width: chordWidth,
                      height: rowHeight - 2,
                    }}
                    className="absolute bg-cyan-500/10 border border-cyan-400/20 rounded pointer-events-none"
                  />
                );
              });
            })}

            {/* Rendered Melody Notes */}
            {notes.map((note) => {
              if (note.midi < MIN_MIDI || note.midi > MAX_MIDI) return null;

              const left = note.startTick * pixelsPerTick;
              const top = midiToY(note.midi);
              const width = Math.max(10, note.durationTicks * pixelsPerTick);
              const noteName = midiToNoteName(note.midi);

              return (
                <div
                  key={note.id}
                  onMouseDown={(e) => handleNoteMouseDown(e, note)}
                  style={{
                    left,
                    top: top + 1,
                    width,
                    height: rowHeight - 2,
                  }}
                  className={`absolute rounded flex items-center justify-between px-1.5 cursor-grab active:cursor-grabbing group transition-shadow ${
                    note.selected
                      ? 'bg-gradient-to-r from-teal-300 via-cyan-300 to-teal-200 text-slate-950 font-bold border-2 border-white shadow-lg shadow-teal-500/40 ring-1 ring-cyan-200'
                      : 'bg-gradient-to-r from-teal-500/95 to-cyan-600/95 hover:from-teal-400 hover:to-cyan-500 text-slate-950 font-semibold border border-teal-300/60 shadow-sm'
                  }`}
                >
                  {/* Left resize handle */}
                  <div
                    onMouseDown={(e) => handleNoteMouseDown(e, note, 'start')}
                    className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-black/20 hover:bg-black/40 rounded-l"
                  />

                  {/* Note Label */}
                  <span className="text-[10px] font-mono truncate select-none pointer-events-none">
                    {noteName}
                  </span>

                  {/* Right resize handle */}
                  <div
                    onMouseDown={(e) => handleNoteMouseDown(e, note, 'end')}
                    className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-black/30 hover:bg-black/50 rounded-r"
                  />
                </div>
              );
            })}

            {/* Marquee Selection Rectangle */}
            {dragState?.mode === 'marquee' && dragState.marqueeBox && (
              <div
                style={{
                  left: Math.min(dragState.marqueeBox.startX, dragState.marqueeBox.currentX),
                  top: Math.min(dragState.marqueeBox.startY, dragState.marqueeBox.currentY),
                  width: Math.abs(dragState.marqueeBox.currentX - dragState.marqueeBox.startX),
                  height: Math.abs(dragState.marqueeBox.currentY - dragState.marqueeBox.startY),
                }}
                className="absolute bg-cyan-500/20 border-2 border-cyan-400 pointer-events-none rounded"
              />
            )}

            {/* Playhead Line */}
            <div
              style={{
                left: currentPlayheadTick * pixelsPerTick,
                height: gridHeight,
              }}
              className="absolute top-0 w-0.5 bg-cyan-400 pointer-events-none z-30 shadow-[0_0_12px_#22d3ee]"
            >
              <div className="w-2.5 h-2.5 bg-cyan-400 rotate-45 -ml-1 -mt-1 shadow" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Velocity Lane (FL Studio Style Velocity Stems) */}
      {showVelocityLane && (
        <div className="h-24 bg-[#11141a] border-t border-[#252c3a] flex shrink-0 select-none">
          {/* Left spacer matching keyboard width */}
          <div
            style={{ width: KEYBOARD_WIDTH }}
            className="h-full border-r border-[#252c3a] flex flex-col justify-between p-1 bg-[#0e1015] shrink-0 font-mono text-[9px] text-slate-400"
          >
            <span>127</span>
            <span className="text-slate-400 text-center font-sans uppercase font-bold text-[8px]">
              Velocity
            </span>
            <span>0</span>
          </div>

          {/* Draggable Velocity Stems Area */}
          <div
            ref={velocityContainerRef}
            className="flex-1 h-full overflow-hidden relative bg-[#13161c]"
          >
            <div
              style={{ width: gridWidth }}
              className="relative h-full"
            >
              {/* Reference Grid lines for 127, 64, 0 */}
              <div className="absolute top-0 left-0 right-0 border-b border-[#252c3a]/50" />
              <div className="absolute top-1/2 left-0 right-0 border-b border-[#252c3a]/30" />

              {/* Stems for each note */}
              {notes.map((note) => {
                const left = note.startTick * pixelsPerTick;
                const heightPercent = (note.velocity / 127) * 100;

                return (
                  <div
                    key={`vel-${note.id}`}
                    onMouseDown={(e) => handleVelocityMouseDown(e, note)}
                    style={{ left: left + 2 }}
                    className="absolute bottom-0 w-4 group cursor-ns-resize flex flex-col items-center"
                  >
                    {/* Velocity value tooltip on hover */}
                    <span className="text-[8px] font-mono text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {note.velocity}
                    </span>

                    {/* Stem Circle Knob */}
                    <div
                      style={{ marginBottom: `${heightPercent * 0.8}%` }}
                      className={`w-2.5 h-2.5 rounded-full transition-transform group-hover:scale-125 ${
                        note.selected
                          ? 'bg-cyan-300 ring-2 ring-white shadow-[0_0_8px_rgba(34,211,238,0.7)]'
                          : 'bg-teal-400/90 group-hover:bg-teal-300 shadow-[0_0_6px_rgba(20,184,166,0.5)]'
                      }`}
                    />

                    {/* Stem Vertical Bar */}
                    <div
                      style={{ height: `${heightPercent * 0.8}%` }}
                      className={`w-1 rounded-t ${
                        note.selected ? 'bg-cyan-300' : 'bg-teal-500/70 group-hover:bg-teal-400'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
