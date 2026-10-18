/**
 * Guide Modal: Quick Start & How to Use Guide for ChordMood
 * Bilingual (Arabic & English) with detailed explanations of melody generation,
 * seed mechanics, Piano Roll editing, chord recommendations, and export.
 */

import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Wand2,
  Download,
  Sliders,
  Keyboard,
  Sparkles,
  Dice5,
  Languages,
} from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 select-none">
      <div className="bg-[#0e1619] border border-teal-500/30 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-[#1b2b30] flex items-center justify-between bg-[#111e22]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-500/20 text-teal-300">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">
                {lang === 'ar' ? 'دليل الاستخدام والأسرار الموسيقية' : 'Studio Guide & How to Use'}
              </h3>
              <p className="text-[11px] text-teal-400/80">
                {lang === 'ar'
                  ? 'طريقة استخدام ChordMood، نظام التوليد الذكي، وتحرير البيانو رول'
                  : 'Mastering rule-based melody generation, piano roll editing, and export'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#17262b] border border-teal-500/30 text-teal-300 text-xs hover:bg-teal-500/20 transition-colors"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'English' : 'عربي'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs leading-relaxed" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          {/* Key Answer Card: Does it generate the same melody each time? */}
          <div className="bg-gradient-to-r from-teal-950/60 to-cyan-950/60 border border-teal-500/40 p-3.5 rounded-xl text-teal-100">
            <h4 className="font-bold text-teal-300 text-xs flex items-center gap-2 mb-1">
              <Dice5 className="w-4 h-4 text-teal-400 shrink-0" />
              {lang === 'ar'
                ? 'هل الموقع يعطي نفس الميلودي كل مرة أم ميلودي جديدة؟'
                : 'Does the generator give the same melody or a new one each time?'}
            </h4>
            <p className="text-[11px] text-slate-300 leading-normal">
              {lang === 'ar'
                ? 'الوضع الافتراضي (Auto-New) مفعل دائماً، مما يعني أنك في كل مرة تضغط فيها على زر "Generate Melody" أو "New Idea"، يقوم المحرك باختيار Seed جديد تلقائياً لابتكار ميلودي مختلفة ومميزة تماماً! وإذا أعجبتك ميلودي معينة وأردت تثبيتها لضبط بارامترات أخرى دون أن تضيع، يمكنك الضغط على زر (🔒 Locked) لتجميد نفس اللحن وتكراره بنسبة 100%.'
                : 'By default, "Auto-New" is enabled, generating a brand new original melody with a fresh seed on every single click! If you like a melody and want to lock it to fine-tune other parameters, simply toggle the Seed button to "🔒 Locked".'}
            </p>
          </div>

          {/* Step 1 */}
          <div className="flex gap-3 items-start bg-[#121c21] p-3 rounded-lg border border-[#1b2b32]">
            <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center shrink-0 text-xs">
              1
            </div>
            <div>
              <h4 className="font-bold text-slate-100 text-xs flex items-center gap-1.5 mb-0.5">
                <Sliders className="w-3.5 h-3.5 text-teal-400" />
                {lang === 'ar' ? 'اختر النمط، السلم، والمشاعر (Genre & Mood)' : 'Configure Genre, Scale & Mood'}
              </h4>
              <p className="text-slate-300 text-[11px]">
                {lang === 'ar'
                  ? 'اختر النمط الموسيقي (Funk, Classical, Jazz, EDM, Lo-fi, Cinematic...)، والسلم الموسيقي والمقام (Major, Dorian, Harmonic Minor...). يمكنك ضبط أبعاد المشاعر الخمسة (السعادة، الطاقة، السطوع، التوتر، والتعقيد) لتوجيه الذكاء التوليدي بدقة.'
                  : 'Choose your genre, key (C, D, F#...), and mode. Adjust the 5 emotional dimensions (Valence, Energy, Brightness, Tension, Complexity) to steer musical expression.'}
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-3 items-start bg-[#121c21] p-3 rounded-lg border border-[#1b2b32]">
            <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center shrink-0 text-xs">
              2
            </div>
            <div>
              <h4 className="font-bold text-slate-100 text-xs flex items-center gap-1.5 mb-0.5">
                <Wand2 className="w-3.5 h-3.5 text-teal-400" />
                {lang === 'ar' ? 'التوليد الذكي (Intelligent Engine)' : 'Generate Smart Melodies'}
              </h4>
              <p className="text-slate-300 text-[11px]">
                {lang === 'ar'
                  ? 'يقوم نظام الذكاء الموسيقي بتوليد 6 نماذج موسيقية مختلفة (سؤال وجواب Antecedent/Consequent، القوس الصاعد Arch، التدفق الانحداري Cascade، واللازمة الإيقاعية Hook Ostinato)، ثم يقوم بتقييم أفضل لحن يعزف نغمات الكورد على الضربات القوية ويحل التوتر بنهاية الجملة.'
                  : 'The intelligent engine competes 6 musical archetypes (Call & Response, Arch, Cascade, Hook Ostinato, Apex Climax), ranking candidates on downbeat chord resonance and cadential release.'}
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-3 items-start bg-[#121c21] p-3 rounded-lg border border-[#1b2b32]">
            <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center shrink-0 text-xs">
              3
            </div>
            <div>
              <h4 className="font-bold text-slate-100 text-xs flex items-center gap-1.5 mb-0.5">
                <Keyboard className="w-3.5 h-3.5 text-teal-400" />
                {lang === 'ar' ? 'التحرير الاحترافي في البيانو رول (Piano Roll)' : 'Edit Notes in the Piano Roll'}
              </h4>
              <ul className="text-slate-300 text-[11px] list-disc list-inside space-y-1 mt-1">
                <li>{lang === 'ar' ? 'أداة القلم (Draw): اضغط في أي خلية فارغة لإضافة نوتة، واسحب لتغيير الطبقة الصوتية أو التوقيت.' : 'Draw Tool: Click empty cells to add notes; drag to reposition.'}</li>
                <li>{lang === 'ar' ? 'تعديل المدة: اسحب الحافة اليمنى أو اليسرى للنوتة لتطويلها أو تقصيرها.' : 'Resize: Drag left/right note borders to change length.'}</li>
                <li>{lang === 'ar' ? 'التحديد (Select): اسحب مربع تحديد أو اضغط مع زر Shift لتحديد عدة نغمات معاً.' : 'Selection: Marquee drag or Shift-click multiple notes.'}</li>
                <li>{lang === 'ar' ? 'شريط الشدة (Velocity): في الأسفل يمكنك تعديل قوة النقر لكل نوتة على حدة.' : 'Velocity Lane: Drag vertical stems in bottom lane to adjust velocity.'}</li>
              </ul>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-3 items-start bg-[#121c21] p-3 rounded-lg border border-[#1b2b32]">
            <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center shrink-0 text-xs">
              4
            </div>
            <div>
              <h4 className="font-bold text-slate-100 text-xs flex items-center gap-1.5 mb-0.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                {lang === 'ar' ? 'التناغم والكوردات التوافقية (Chords)' : 'Chord Recommendations & Harmony'}
              </h4>
              <p className="text-slate-300 text-[11px]">
                {lang === 'ar'
                  ? 'اضغط على زر Suggest في مسار الكوردات Chords ليقوم المحلل باقتراح متتاليات كوردات احترافية متوافقة مع الميلودي، مع إمكانية سماعها مسبقاً وتطبيقها بضغطة زر.'
                  : 'Click "Suggest" on the Chord Lane. The harmonic analyzer recommends progressions matched to your melody with Roman numeral analysis and auditioning.'}
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex gap-3 items-start bg-[#121c21] p-3 rounded-lg border border-[#1b2b32]">
            <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center shrink-0 text-xs">
              5
            </div>
            <div>
              <h4 className="font-bold text-slate-100 text-xs flex items-center gap-1.5 mb-0.5">
                <Download className="w-3.5 h-3.5 text-teal-400" />
                {lang === 'ar' ? 'التصدير الاحترافي (MIDI & WAV)' : 'Export to MIDI & WAV'}
              </h4>
              <p className="text-slate-300 text-[11px]">
                {lang === 'ar'
                  ? 'يمكنك تصدير ملف MIDI متعدد المسارات (.mid) متوافق 100% مع FL Studio و Ableton و Logic، أو استخراج ملف صوتي WAV عالي النقاء 16-bit PCM.'
                  : 'Export standards-compliant multi-track MIDI (.mid) for any DAW, or render uncompressed 16-bit PCM WAV audio.'}
              </p>
            </div>
          </div>

          {/* Shortcuts Summary */}
          <div className="bg-[#111c21] p-3 rounded-lg border border-[#1b2d35] flex flex-wrap items-center justify-between text-[11px] gap-2">
            <span className="font-semibold text-teal-300">
              {lang === 'ar' ? 'اختصارات لوحة المفاتيح السريعة:' : 'Keyboard Shortcuts:'}
            </span>
            <div className="flex flex-wrap gap-2 text-slate-400 font-mono text-[10px]">
              <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-200">Space</kbd> Play/Pause</span>
              <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-200">Ctrl+Z</kbd> Undo</span>
              <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-200">Ctrl+Y</kbd> Redo</span>
              <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-200">Ctrl+D</kbd> Duplicate</span>
              <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-200">Del</kbd> Delete</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#1b2b30] bg-[#111e22] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-300 hover:to-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-md shadow-teal-500/20"
          >
            {lang === 'ar' ? 'حسناً، فلنبدأ التلحين!' : 'Got it, Let\'s Compose!'}
          </button>
        </div>
      </div>
    </div>
  );
};
