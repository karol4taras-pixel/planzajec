import React, { useState } from 'react';
import { Download, Smartphone, X, Check, Share2, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If running as standalone app, show subtle installed badge or hide
  if (isInstalled) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
        <Check className="w-3.5 h-3.5 text-emerald-400" />
        <span>PWA Zainstalowane</span>
      </div>
    );
  }

  // Android / Chromium / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-3 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 hover:from-emerald-500 hover:to-green-500 transition active:scale-95"
        title="Zainstaluj aplikację na telefonie"
      >
        <Download className="w-4 h-4" />
        <span>Zainstaluj App</span>
      </button>
    );
  }

  // iOS Safari flow
  return (
    <>
      <button
        onClick={() => setShowIOSGuide(true)}
        className="flex items-center gap-1.5 rounded-xl border border-emerald-700/60 bg-emerald-950/40 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-900/50 transition active:scale-95"
        title="Instrukcja instalacji na iOS / iPhone"
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Dodaj do ekranu</span>
        <span className="sm:hidden">Zainstaluj</span>
      </button>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-neutral-900 border border-emerald-800/60 p-6 shadow-2xl text-neutral-100 relative">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center mb-4 shadow-lg shadow-emerald-900/40">
              <Smartphone className="w-6 h-6 text-white" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">
              Instalacja na iOS (iPhone / iPad)
            </h3>
            <p className="text-xs text-neutral-400 mb-4">
              Zainstaluj Plan SGGW WTD jako natywną aplikację z ikoną na pulpicie:
            </p>

            <div className="space-y-3 text-sm text-neutral-300">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-neutral-800/80 border border-neutral-700/50">
                <div className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-white">Krok 1:</span> W przeglądarce Safari stuknij przycisk <strong className="text-emerald-300">Udostępnij</strong> (ikona z kwadratem i strzałką w górę) na dolnym pasku.
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-neutral-800/80 border border-neutral-700/50">
                <div className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-white">Krok 2:</span> Przewiń listę opcji w dół i wybierz <strong className="text-emerald-300">Do ekranu początkowego</strong>.
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-neutral-800/80 border border-neutral-700/50">
                <div className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-white">Krok 3:</span> Kliknij <strong className="text-white">Dodaj</strong> w prawym górnym rogu. Gotowe!
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-sm font-semibold text-white shadow-md transition"
            >
              Rozumiem, dziękuję
            </button>
          </div>
        </div>
      )}
    </>
  );
};
