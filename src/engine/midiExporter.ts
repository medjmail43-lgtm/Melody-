/**
 * Standards-compliant binary Standard MIDI File (SMF Type 1) Exporter
 * Generates valid .mid files compatible with FL Studio, Ableton, Logic, and other DAWs.
 */

import { Note, Chord, TICKS_PER_QUARTER } from '../types/music';

// Variable-length quantity (VLQ) encoder
export function encodeVLQ(value: number): number[] {
  let val = Math.max(0, Math.floor(value));
  const buffer: number[] = [val & 0x7f];

  while ((val >>= 7) > 0) {
    buffer.unshift((val & 0x7f) | 0x80);
  }
  return buffer;
}

// Convert 32-bit int to 4 bytes big-endian
function int32ToBytes(n: number): number[] {
  return [
    (n >>> 24) & 0xff,
    (n >>> 16) & 0xff,
    (n >>> 8) & 0xff,
    n & 0xff,
  ];
}

// Convert 16-bit int to 2 bytes big-endian
function int16ToBytes(n: number): number[] {
  return [(n >>> 8) & 0xff, n & 0xff];
}

interface MidiEvent {
  tick: number;
  data: number[];
  priority: number; // Note-Off before Note-On at same tick
}

export function buildMidiFile(
  notes: Note[],
  chords: Chord[],
  bpm: number = 110,
  beatsPerBar: number = 4
): Uint8Array {
  const ppq = TICKS_PER_QUARTER; // 960 ticks

  // Track 0: Conductor Track (Tempo & Time Signature)
  const track0Events: MidiEvent[] = [];
  
  // Time Signature: 4/4
  track0Events.push({
    tick: 0,
    data: [0xff, 0x58, 0x04, beatsPerBar, 0x02, 0x18, 0x08],
    priority: 0,
  });

  // Set Tempo: microseconds per quarter note = 60,000,000 / BPM
  const mpqn = Math.round(60000000 / bpm);
  track0Events.push({
    tick: 0,
    data: [
      0xff,
      0x51,
      0x03,
      (mpqn >>> 16) & 0xff,
      (mpqn >>> 8) & 0xff,
      mpqn & 0xff,
    ],
    priority: 1,
  });

  // Track 1: Melody Track (Channel 0)
  const track1Events: MidiEvent[] = [];
  const melodyTrackName = 'ChordMood Melody';
  const nameBytes1 = Array.from(melodyTrackName).map(c => c.charCodeAt(0));
  track1Events.push({
    tick: 0,
    data: [0xff, 0x03, nameBytes1.length, ...nameBytes1],
    priority: 0,
  });
  // Program change (Grand Piano: 0)
  track1Events.push({
    tick: 0,
    data: [0xc0, 0x00],
    priority: 1,
  });

  for (const n of notes) {
    const pitch = Math.max(0, Math.min(127, n.midi));
    const vel = Math.max(1, Math.min(127, n.velocity));
    
    // Note On
    track1Events.push({
      tick: n.startTick,
      data: [0x90, pitch, vel],
      priority: 3,
    });
    // Note Off (using 0x80)
    track1Events.push({
      tick: n.startTick + n.durationTicks,
      data: [0x80, pitch, 0x00],
      priority: 2,
    });
  }

  // Track 2: Chords Track (Channel 1)
  const track2Events: MidiEvent[] = [];
  const chordsTrackName = 'ChordMood Chords';
  const nameBytes2 = Array.from(chordsTrackName).map(c => c.charCodeAt(0));
  track2Events.push({
    tick: 0,
    data: [0xff, 0x03, nameBytes2.length, ...nameBytes2],
    priority: 0,
  });
  // Program change (Warm Pad / Strings: 89)
  track2Events.push({
    tick: 0,
    data: [0xc1, 89],
    priority: 1,
  });

  for (const c of chords) {
    for (const pitch of c.voicingNotes) {
      const validPitch = Math.max(0, Math.min(127, pitch));
      track2Events.push({
        tick: c.startTick,
        data: [0x91, validPitch, 75],
        priority: 3,
      });
      track2Events.push({
        tick: c.startTick + c.durationTicks,
        data: [0x81, validPitch, 0x00],
        priority: 2,
      });
    }
  }

  // Helper to compile events into an MTrk chunk
  const compileTrack = (events: MidiEvent[]): number[] => {
    // Sort events by tick, then priority
    events.sort((a, b) => {
      if (a.tick !== b.tick) return a.tick - b.tick;
      return a.priority - b.priority;
    });

    const trackBytes: number[] = [];
    let lastTick = 0;

    for (const ev of events) {
      const delta = ev.tick - lastTick;
      trackBytes.push(...encodeVLQ(delta));
      trackBytes.push(...ev.data);
      lastTick = ev.tick;
    }

    // End of Track meta event: 00 FF 2F 00
    trackBytes.push(0x00, 0xff, 0x2f, 0x00);

    // MTrk header + 32-bit chunk length + data
    return [
      0x4d, 0x54, 0x72, 0x6b, // 'MTrk'
      ...int32ToBytes(trackBytes.length),
      ...trackBytes,
    ];
  };

  const compiledTrack0 = compileTrack(track0Events);
  const compiledTrack1 = compileTrack(track1Events);
  const compiledTrack2 = compileTrack(track2Events);

  const numTracks = 3;

  // Header chunk 'MThd' (14 bytes total)
  // Format 1 (multi-track synchronous), numTracks = 3, division = PPQ
  const headerChunk = [
    0x4d, 0x54, 0x68, 0x64, // 'MThd'
    0x00, 0x00, 0x00, 0x06, // Header length = 6
    0x00, 0x01,             // Format 1
    ...int16ToBytes(numTracks),
    ...int16ToBytes(ppq),
  ];

  const fullFile = new Uint8Array([
    ...headerChunk,
    ...compiledTrack0,
    ...compiledTrack1,
    ...compiledTrack2,
  ]);

  return fullFile;
}

export function downloadMidiFile(
  notes: Note[],
  chords: Chord[],
  bpm: number = 110,
  filename: string = 'chordmood_composition.mid'
) {
  const data = buildMidiFile(notes, chords, bpm);
  const blob = new Blob([data.buffer as ArrayBuffer], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
