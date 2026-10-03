import React from 'react';
import { Download, ExternalLink, FileSpreadsheet, FileText, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { SGGW_OFFICIAL_LINKS } from '../data/sampleSchedules';
import { RokStudiow } from '../types/schedule';

interface SggwFilesViewProps {
  isDark: boolean;
  activeRok: RokStudiow;
  onSelectRok: (rok: RokStudiow) => void;
}

export const SggwFilesView: React.FC<SggwFilesViewProps> = ({
  isDark,
  activeRok,
  onSelectRok,
}) => {
  return (
    <div className="space-y-4 pb-20">
      {/* Title directly inspired by Screenshot #1 */}
      <div className={`p-4 rounded-2xl border ${
        isDark ? 'bg-[#111913] border-[#1d2d20]' : 'bg-white border-emerald-100'
      }`}>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Studia niestacjonarne I stopnia
        </h2>
        <p className="text-xs text-stone-400 mt-1">
          Oficjalne pliki harmonogramów i planów zajęć pobierane bezpośrednio ze strony Wydziału Nauk Leśnych i Technologii Drewna SGGW.
        </p>

        <div className="mt-3">
          <a
            href={SGGW_OFFICIAL_LINKS.portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-400 hover:text-emerald-300 font-bold inline-flex items-center gap-1.5"
          >
            <span>Otwórz stronę wydziałową (wnlid.sggw.edu.pl)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Meblarstwo section from Screenshot #1 */}
      <div className={`p-4 rounded-2xl border ${
        isDark ? 'bg-[#111913] border-[#1d2d20]' : 'bg-white border-emerald-100'
      }`}>
        <h3 className="text-lg font-extrabold text-white mb-3">
          Meblarstwo (Zaoczne)
        </h3>

        <div className="space-y-2">
          {/* Rok I */}
          <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
            activeRok === 1
              ? 'bg-[#18271c] border-emerald-500/50'
              : isDark ? 'bg-[#141f17] border-[#223626]' : 'bg-stone-50 border-stone-200'
          }`}>
            <a
              href={SGGW_OFFICIAL_LINKS.rok1Url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-emerald-400 hover:text-emerald-300 transition flex-1"
            >
              <Download className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Rok I — semestr 1 (XLS, 42 KB)</span>
            </a>

            <button
              onClick={() => onSelectRok(1)}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-700/40 hover:bg-emerald-900 transition shrink-0"
            >
              {activeRok === 1 ? 'Aktywny w aplikacji' : 'Włącz w planie'}
            </button>
          </div>

          {/* Rok II */}
          <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
            activeRok === 2
              ? 'bg-[#18271c] border-emerald-500/50'
              : isDark ? 'bg-[#141f17] border-[#223626]' : 'bg-stone-50 border-stone-200'
          }`}>
            <a
              href={SGGW_OFFICIAL_LINKS.rok2Url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-emerald-400 hover:text-emerald-300 transition flex-1"
            >
              <Download className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Rok II — semestr 3 (XLS, 36 KB)</span>
            </a>

            <button
              onClick={() => onSelectRok(2)}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-700/40 hover:bg-emerald-900 transition shrink-0"
            >
              {activeRok === 2 ? 'Aktywny w aplikacji' : 'Włącz w planie'}
            </button>
          </div>

          {/* Rok III */}
          <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
            activeRok === 3
              ? 'bg-[#18271c] border-emerald-500/50'
              : isDark ? 'bg-[#141f17] border-[#223626]' : 'bg-stone-50 border-stone-200'
          }`}>
            <a
              href={SGGW_OFFICIAL_LINKS.rok3Url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-emerald-400 hover:text-emerald-300 transition flex-1"
            >
              <Download className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Rok III — semestr 5 (XLS, 35 KB)</span>
            </a>

            <button
              onClick={() => onSelectRok(3)}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-700/40 hover:bg-emerald-900 transition shrink-0"
            >
              {activeRok === 3 ? 'Aktywny w aplikacji' : 'Włącz w planie'}
            </button>
          </div>

          {/* Rok IV */}
          <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
            activeRok === 4
              ? 'bg-[#18271c] border-emerald-500/50'
              : isDark ? 'bg-[#141f17] border-[#223626]' : 'bg-stone-50 border-stone-200'
          }`}>
            <a
              href={SGGW_OFFICIAL_LINKS.rok4Url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-emerald-400 hover:text-emerald-300 transition flex-1"
            >
              <Download className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Rok IV — semestr 7 (XLS, 42 KB)</span>
            </a>

            <button
              onClick={() => onSelectRok(4)}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-700/40 hover:bg-emerald-900 transition shrink-0"
            >
              {activeRok === 4 ? 'Aktywny w aplikacji' : 'Włącz w planie'}
            </button>
          </div>
        </div>
      </div>

      {/* Harmonogram section from Screenshot #2 */}
      <div className={`p-4 rounded-2xl border ${
        isDark ? 'bg-[#111913] border-[#1d2d20]' : 'bg-white border-emerald-100'
      }`}>
        <a
          href={SGGW_OFFICIAL_LINKS.harmonogramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-2.5 text-xs sm:text-sm font-bold text-emerald-400 hover:text-emerald-300 transition leading-snug"
        >
          <Download className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            Harmonogram zjazdów dla studentów studiów niestacjonarnych w roku akademickim 2026/2027 (kierunki: technologia drewna, meblarstwo)
          </span>
        </a>
      </div>
    </div>
  );
};
