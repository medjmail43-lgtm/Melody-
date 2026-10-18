/**
 * Test Runner Modal:
 * Interactive dialog to execute automated tests validating:
 * - Scale membership & pitch class math
 * - Interval limits & contour rules
 * - Rhythm quantization & bar boundaries
 * - BPM timing calculations
 * - Chord compatibility scoring heuristics
 * - MIDI binary format compliance (SMF Type 1, PPQ, MThd, MTrk)
 * - WAV 16-bit PCM encoding verification
 */

import React, { useState, useEffect } from 'react';
import { runAllAutomatedTests, TestResult } from '../engine/testRunner';
import { CheckCircle2, XCircle, RefreshCw, X, ShieldCheck, Clock } from 'lucide-react';

interface TestRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestRunnerModal: React.FC<TestRunnerModalProps> = ({ isOpen, onClose }) => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const executeTests = async () => {
    setIsRunning(true);
    try {
      const res = await runAllAutomatedTests();
      setResults(res);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      executeTests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  const allPassed = totalCount > 0 && passedCount === totalCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none">
      <div className="bg-[#14171f] border border-[#2b3345] rounded-xl w-full max-w-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-[#252c3c] flex items-center justify-between bg-[#171b26]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-slate-100 text-sm">
                Musical Engine & Format Test Suite
              </h3>
              <p className="text-[11px] text-slate-400">
                Automated verification of music theory rules, MIDI binary layout, and audio rendering
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

        {/* Status Bar */}
        <div className="px-4 py-2.5 bg-[#10131a] border-b border-[#252c3c] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {allPassed ? (
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                All {totalCount} Tests Passed (100% Verified)
              </span>
            ) : isRunning ? (
              <span className="text-teal-400 font-medium">Running automated assertions...</span>
            ) : (
              <span className="text-red-400 font-medium">
                {passedCount} / {totalCount} Passed
              </span>
            )}
          </div>
          <button
            onClick={executeTests}
            disabled={isRunning}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#202634] hover:bg-[#2b3345] text-slate-200 font-medium text-[11px] transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isRunning ? 'animate-spin' : ''}`} />
            <span>Re-run Suite</span>
          </button>
        </div>

        {/* Results List */}
        <div className="p-4 space-y-2 overflow-y-auto flex-1">
          {results.map((res, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-3 ${
                res.passed
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                  : 'bg-red-950/20 border-red-500/30 text-red-200'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {res.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-slate-100 flex items-center gap-2">
                    {res.name}
                    {res.category && (
                      <span className="text-[10px] text-slate-400 font-mono font-normal">
                        [{res.category}]
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {res.message}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 shrink-0">
                <Clock className="w-3 h-3" />
                <span>{res.durationMs}ms</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
