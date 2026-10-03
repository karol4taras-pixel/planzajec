import React, { useState } from 'react';
import { Calendar, Download, Check, ExternalLink, X, Smartphone, Globe } from 'lucide-react';
import { ScheduleEvent, StudyMode, TurnusType } from '../types/schedule';
import { generateICalendarFile, downloadICalendarFile } from '../utils/calendarSync';
import { OFFICIAL_ZJAZDY_CALENDAR } from '../data/sampleSchedules';

interface GoogleCalendarExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: ScheduleEvent[];
  mode: StudyMode;
  turnus: TurnusType;
}

export const GoogleCalendarExportModal: React.FC<GoogleCalendarExportModalProps> = ({
  isOpen,
  onClose,
  events,
  mode,
  turnus,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [exportOption, setExportOption] = useState<'mode_only' | 'all'>('mode_only');

  if (!isOpen) return null;

  const targetEvents = events.filter(e => {
    if (exportOption === 'all') return true;
    if (e.mode !== mode) return false;
    if (mode === 'zaoczne') {
      return e.turnus === turnus || e.turnus === 'Wszystkie';
    }
    return true;
  });

  const handleDownloadICS = () => {
    const calendarName = `Plan WTD SGGW (Meblarstwo Zaoczne ${turnus})`;

    const icsData = generateICalendarFile(targetEvents, calendarName, OFFICIAL_ZJAZDY_CALENDAR);
    const fileName = `Plan_Meblarstwo_SGGW_${turnus.replace(/\s+/g, '_')}_${Date.now()}.ics`;
    downloadICalendarFile(icsData, fileName);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 4000);
  };

  const handleOpenGoogleCalendarWeb = () => {
    window.open('https://calendar.google.com/calendar/r/settings/export', '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-[#111608] border border-[#253210] shadow-2xl text-stone-100 my-8 overflow-hidden">
        {/* Header */}
        <div className="bg-[#0d1205] px-6 py-4 border-b border-[#253210] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-[#a2c41f]" />
            <div>
              <h3 className="text-base font-bold text-white">Synchronizacja z Kalendarzem Google</h3>
              <p className="text-xs text-stone-400">Eksport zjazdów semestru zimowego 2026/2027</p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          <div>
            <label className="font-bold text-stone-300 block mb-1.5 uppercase tracking-wider text-[11px]">
              Wybierz zakres eksportu:
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[#253210] bg-[#161d0b] cursor-pointer hover:border-[#54650F]">
                <input
                  type="radio"
                  name="cal_scope"
                  checked={exportOption === 'mode_only'}
                  onChange={() => setExportOption('mode_only')}
                  className="accent-[#54650F]"
                />
                <span className="font-semibold text-stone-100">
                  Tylko Meblarstwo Zaoczne: <strong className="text-[#a2c41f]">{turnus}</strong> ({targetEvents.length} pozycji)
                </span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[#253210] bg-[#161d0b] cursor-pointer hover:border-[#54650F]">
                <input
                  type="radio"
                  name="cal_scope"
                  checked={exportOption === 'all'}
                  onChange={() => setExportOption('all')}
                  className="accent-[#54650F]"
                />
                <span className="text-stone-400">
                  Wszystkie zajęcia w bazie ({events.length} pozycji)
                </span>
              </label>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <button
              onClick={handleDownloadICS}
              className="w-full py-3 px-4 rounded-xl bg-[#54650F] hover:bg-[#687c14] text-white font-extrabold text-sm shadow-md transition active:scale-95 flex items-center justify-center gap-2"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Pobrano plik (.ics) pomyślnie!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Pobierz plik kalendarza (.ics)</span>
                </>
              )}
            </button>

            <button
              onClick={handleOpenGoogleCalendarWeb}
              className="w-full py-2.5 px-3 rounded-xl border border-[#253210] hover:bg-[#1a230d] text-stone-300 font-semibold text-xs transition flex items-center justify-center gap-1.5"
            >
              <Globe className="w-3.5 h-3.5 text-[#a2c41f]" />
              <span>Otwórz Google Kalendarz w przeglądarce</span>
              <ExternalLink className="w-3 h-3 text-stone-400" />
            </button>
          </div>

          {/* Guide */}
          <div className="p-3.5 rounded-xl bg-[#090d04] border border-[#253210] space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-stone-200">
              <Smartphone className="w-4 h-4 text-[#a2c41f]" />
              <span>Jak dodać na telefonie (Android & iPhone)?</span>
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              1. Kliknij <strong>Pobierz plik (.ics)</strong>.<br />
              2. Otwórz pobrany plik na telefonie.<br />
              3. Wybierz Kalendarz Google lub Apple. Kliknij <strong>Dodaj wszystko</strong>.
            </p>
          </div>
        </div>

        <div className="bg-[#0d1205] px-6 py-3 border-t border-[#253210] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-[#253210] text-stone-300 text-xs font-semibold hover:bg-[#1a230d]"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
