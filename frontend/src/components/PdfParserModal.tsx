import React, { useState } from 'react';
import { Upload, X, FileText, CheckCircle, AlertTriangle, Sparkles, Loader2, ArrowRight, ExternalLink } from 'lucide-react';
import { ScheduleEvent, StudyMode, TurnusType } from '../types/schedule';
import { extractTextFromPdf, parseScheduleTextLocally, parseScheduleWithAI } from '../utils/pdfParser';
import { INITIAL_SCHEDULE_EVENTS } from '../data/sampleSchedules';

interface PdfParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySchedule: (events: ScheduleEvent[], mode: StudyMode, turnus: TurnusType) => void;
}

export const PdfParserModal: React.FC<PdfParserModalProps> = ({
  isOpen,
  onClose,
  onApplySchedule,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState<string>('');
  const [modePreference, setModePreference] = useState<StudyMode>('stacjonarne');
  const [turnusPreference, setTurnusPreference] = useState<TurnusType>('Turnus A');
  const [useAI, setUseAI] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [parsedResults, setParsedResults] = useState<ScheduleEvent[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Wybierz poprawny plik w formacie PDF (.pdf).');
      return;
    }

    setSelectedFile(file);
    setErrorMsg(null);
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      const text = await extractTextFromPdf(buffer);

      let events: ScheduleEvent[] = [];
      if (useAI) {
        events = await parseScheduleWithAI(text, modePreference, turnusPreference);
      } else {
        events = parseScheduleTextLocally(text, modePreference, turnusPreference);
      }

      setParsedResults(events);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Wystąpił błąd podczas odczytu pliku PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleParsePasted = async () => {
    if (!pastedText.trim()) {
      setErrorMsg('Wklej tekst lub tabelę z planu zajęć przed rozpoczęciem parsowania.');
      return;
    }

    setErrorMsg(null);
    setIsProcessing(true);

    try {
      let events: ScheduleEvent[] = [];
      if (useAI) {
        events = await parseScheduleWithAI(pastedText, modePreference, turnusPreference);
      } else {
        events = parseScheduleTextLocally(pastedText, modePreference, turnusPreference);
      }

      setParsedResults(events);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Błąd podczas parsowania tekstu.');
    } finally {
      setIsProcessing(false);
    }
  };

  const loadPreset = (presetType: 'stacjonarne' | 'zaoczne_a' | 'zaoczne_b') => {
    setErrorMsg(null);
    if (presetType === 'stacjonarne') {
      const stac = INITIAL_SCHEDULE_EVENTS.filter(e => e.mode === 'stacjonarne');
      setModePreference('stacjonarne');
      setParsedResults(stac);
    } else if (presetType === 'zaoczne_a') {
      const zaoczA = INITIAL_SCHEDULE_EVENTS.filter(e => e.mode === 'zaoczne' && (e.turnus === 'Turnus A' || e.turnus === 'Wszystkie'));
      setModePreference('zaoczne');
      setTurnusPreference('Turnus A');
      setParsedResults(zaoczA);
    } else {
      const zaoczB = INITIAL_SCHEDULE_EVENTS.filter(e => e.mode === 'zaoczne' && (e.turnus === 'Turnus B' || e.turnus === 'Wszystkie'));
      setModePreference('zaoczne');
      setTurnusPreference('Turnus B');
      setParsedResults(zaoczB);
    }
  };

  const handleApply = () => {
    if (!parsedResults || parsedResults.length === 0) return;
    onApplySchedule(parsedResults, modePreference, turnusPreference);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white border border-stone-200 shadow-2xl text-stone-900 my-8 overflow-hidden">
        {/* Header */}
        <div className="bg-[#1b4332] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-emerald-300" />
            <div>
              <h3 className="text-base font-bold">Parser PDF Planu Zajęć SGGW WTD</h3>
              <p className="text-xs text-emerald-200/80">Wyciąganie godzin, sal i przedmiotów z plików wnlid.sggw.edu.pl</p>
            </div>
          </div>
          <button onClick={onClose} className="text-emerald-200 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-stone-800">
          <div className="p-3 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-between">
            <span className="text-stone-700">
              Pliki PDF publikowane są na: <strong className="text-[#1b4332]">wnlid.sggw.edu.pl</strong>
            </span>
            <a
              href="https://wnlid.sggw.edu.pl/strefa-studenta/plan-zajec-i-programy-studiow/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2d6a4f] hover:underline font-bold flex items-center gap-1"
            >
              <span>Strona WTD</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-600 font-bold mb-1">Tryb studiów:</label>
              <select
                value={modePreference}
                onChange={(e) => setModePreference(e.target.value as StudyMode)}
                className="w-full p-2 rounded-lg bg-stone-50 border border-stone-300 text-stone-900 focus:outline-none focus:border-[#2d6a4f]"
              >
                <option value="stacjonarne">Stacjonarne (Dziennie)</option>
                <option value="zaoczne">Zaoczne (Niestacjonarne)</option>
              </select>
            </div>

            <div>
              <label className="block text-stone-600 font-bold mb-1">Turnus dla zaocznych:</label>
              <select
                value={turnusPreference}
                onChange={(e) => setTurnusPreference(e.target.value as TurnusType)}
                className="w-full p-2 rounded-lg bg-stone-50 border border-stone-300 text-stone-900 focus:outline-none focus:border-[#2d6a4f]"
                disabled={modePreference !== 'zaoczne'}
              >
                <option value="Turnus A">Turnus A</option>
                <option value="Turnus B">Turnus B</option>
                <option value="Wszystkie">Wszystkie turnusy</option>
              </select>
            </div>
          </div>

          {/* Dropzone */}
          <div className="relative border-2 border-dashed border-stone-300 hover:border-[#2d6a4f] rounded-2xl p-6 text-center bg-stone-50 transition group cursor-pointer">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center justify-center">
              <Upload className="w-8 h-8 text-[#2d6a4f] mb-1.5" />
              <p className="font-bold text-stone-800 text-sm">
                {selectedFile ? selectedFile.name : 'Przeciągnij i upuść plik PDF z planem zajęć SGGW'}
              </p>
              <p className="text-[11px] text-stone-500 mt-0.5">
                lub kliknij, aby wybrać z telefonu / komputera
              </p>
            </div>
          </div>

          {/* Quick presets */}
          <div className="space-y-1.5">
            <span className="font-bold text-stone-500 text-[11px] uppercase tracking-wider block">
              Szybkie wczytanie oficjalnego planu WTD SGGW:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => loadPreset('stacjonarne')}
                className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-300 font-semibold text-stone-800 transition"
              >
                🌲 Stacjonarne (Dziennie)
              </button>
              <button
                type="button"
                onClick={() => loadPreset('zaoczne_a')}
                className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-300 font-semibold text-stone-800 transition"
              >
                🪵 Zaoczne Turnus A
              </button>
              <button
                type="button"
                onClick={() => loadPreset('zaoczne_b')}
                className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-300 font-semibold text-stone-800 transition"
              >
                🪵 Zaoczne Turnus B
              </button>
            </div>
          </div>

          {/* Paste text toggle */}
          <details className="text-[11px] text-stone-500">
            <summary className="cursor-pointer hover:text-stone-800 font-medium">
              Chcesz wkleić skopiowany tekst z PDF ręcznie? Kliknij tutaj
            </summary>
            <div className="mt-2 space-y-2">
              <textarea
                rows={3}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Wklej tekst ze strony SGGW..."
                className="w-full p-2.5 rounded-lg bg-stone-50 border border-stone-300 text-stone-900 font-mono text-xs focus:outline-none focus:border-[#2d6a4f]"
              />
              <button
                type="button"
                onClick={handleParsePasted}
                disabled={isProcessing}
                className="px-4 py-1.5 rounded-lg bg-[#2d6a4f] hover:bg-[#1b4332] text-white font-bold transition flex items-center gap-1.5"
              >
                {isProcessing && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Parsuj wklejony tekst</span>
              </button>
            </div>
          </details>

          {isProcessing && (
            <div className="p-3 rounded-xl bg-emerald-50 text-[#1b4332] font-semibold flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#2d6a4f]" />
              <span>AI przetwarza układ tabeli, sale i godziny...</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {parsedResults && parsedResults.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-stone-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-900 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Wyodrębniono {parsedResults.length} zajęć</span>
                </span>
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-4 py-2 rounded-xl bg-[#2d6a4f] hover:bg-[#1b4332] text-white font-bold text-xs shadow transition active:scale-95 flex items-center gap-1.5"
                >
                  <span>Zastosuj do mojego planu</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto rounded-xl border border-stone-200 divide-y divide-stone-100 text-[11px]">
                {parsedResults.map((e, idx) => (
                  <div key={idx} className="p-2 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-[#1b4332]">
                        {['Pn', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'][e.dayOfWeek - 1]} {e.startTime}-{e.endTime}
                      </span>
                      <p className="font-semibold text-stone-800">{e.courseName}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-stone-100 font-mono font-bold text-stone-800">
                      {e.room}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-stone-50 px-6 py-3 border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-100"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
