import React, { useState } from 'react';
import { Check, X, GraduationCap, Calendar, Compass, User, AlertCircle } from 'lucide-react';
import { StudentProfile, KierunekType, RokStudiow, StudyMode, TurnusType } from '../types/schedule';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: StudentProfile;
  onSaveProfile: (profile: StudentProfile) => void;
  isInitialSetup?: boolean;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
  isInitialSetup = false,
}) => {
  const [kierunek, setKierunek] = useState<KierunekType>(profile.kierunek);
  const [rok, setRok] = useState<RokStudiow>(profile.rok);
  const [mode, setMode] = useState<StudyMode>(profile.mode);
  const [turnus, setTurnus] = useState<'Turnus A' | 'Turnus B'>(profile.turnus);
  const [grupa, setGrupa] = useState<string>(profile.grupa);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveProfile({
      kierunek,
      rok,
      mode,
      turnus,
      grupa,
      isConfigured: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-stone-200 shadow-2xl text-stone-900 my-8 overflow-hidden">
        {/* Modal Top Banner (Deep Forest Green) */}
        <div className="bg-[#1b4332] px-6 py-5 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-300" />
              <h2 className="text-lg font-bold tracking-tight">
                {isInitialSetup ? 'Witaj w Planie SGGW WTD!' : 'Twój profil studenta'}
              </h2>
            </div>
            <p className="text-xs text-emerald-100/80 mt-1">
              {isInitialSetup
                ? 'Wybierz swój kierunek, rok i tryb studiów, aby wyświetlić Twój plan.'
                : 'Zmień swój rok lub tryb studiów w dowolnym momencie.'}
            </p>
          </div>

          {!isInitialSetup && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-[#2d6a4f] transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 text-stone-800">
          {/* 1. Kierunek Studiów */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
              1. Kierunek studiów
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setKierunek('Technologia Drewna')}
                className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                  kierunek === 'Technologia Drewna'
                    ? 'border-[#2d6a4f] bg-[#e8f5e9] text-[#1b4332] font-bold shadow-sm'
                    : 'border-stone-200 hover:border-stone-300 text-stone-700 bg-stone-50/50'
                }`}
              >
                <div>
                  <span className="block text-sm">🌲 Technologia Drewna</span>
                  <span className="text-[11px] font-normal text-stone-500">I oraz II stopień</span>
                </div>
                {kierunek === 'Technologia Drewna' && <Check className="w-4 h-4 text-[#2d6a4f]" />}
              </button>

              <button
                type="button"
                onClick={() => setKierunek('Meblarstwo')}
                className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                  kierunek === 'Meblarstwo'
                    ? 'border-[#2d6a4f] bg-[#e8f5e9] text-[#1b4332] font-bold shadow-sm'
                    : 'border-stone-200 hover:border-stone-300 text-stone-700 bg-stone-50/50'
                }`}
              >
                <div>
                  <span className="block text-sm">🪑 Meblarstwo</span>
                  <span className="text-[11px] font-normal text-stone-500">Projektowanie i produkcja</span>
                </div>
                {kierunek === 'Meblarstwo' && <Check className="w-4 h-4 text-[#2d6a4f]" />}
              </button>
            </div>
          </div>

          {/* 2. Tryb Studiów */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
              2. Tryb studiów
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setMode('stacjonarne')}
                className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                  mode === 'stacjonarne'
                    ? 'border-[#2d6a4f] bg-[#e8f5e9] text-[#1b4332] font-bold shadow-sm'
                    : 'border-stone-200 hover:border-stone-300 text-stone-700 bg-stone-50/50'
                }`}
              >
                <div>
                  <span className="block text-sm">Stacjonarne (Dzienne)</span>
                  <span className="text-[11px] font-normal text-stone-500">Poniedziałek – Piątek</span>
                </div>
                {mode === 'stacjonarne' && <Check className="w-4 h-4 text-[#2d6a4f]" />}
              </button>

              <button
                type="button"
                onClick={() => setMode('zaoczne')}
                className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                  mode === 'zaoczne'
                    ? 'border-[#2d6a4f] bg-[#e8f5e9] text-[#1b4332] font-bold shadow-sm'
                    : 'border-stone-200 hover:border-stone-300 text-stone-700 bg-stone-50/50'
                }`}
              >
                <div>
                  <span className="block text-sm">Zaoczne (Niestacjonarne)</span>
                  <span className="text-[11px] font-normal text-stone-500">Zjazdy weekendowe</span>
                </div>
                {mode === 'zaoczne' && <Check className="w-4 h-4 text-[#2d6a4f]" />}
              </button>
            </div>
          </div>

          {/* 3. Rok Studiów */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
              3. Rok studiów
            </label>
            <div className="grid grid-cols-4 gap-2">
              {([1, 2, 3, 4] as RokStudiow[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRok(r)}
                  className={`py-2.5 px-3 rounded-xl border text-center transition font-semibold text-sm ${
                    rok === r
                      ? 'border-[#2d6a4f] bg-[#2d6a4f] text-white shadow-sm'
                      : 'border-stone-200 hover:border-stone-300 bg-stone-50/50 text-stone-700'
                  }`}
                >
                  Rok {r}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Turnus (Only if Zaoczne) */}
          {mode === 'zaoczne' && (
            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Turnus zjazdów (studia zaoczne):
                </label>
              </div>
              <p className="text-[11px] text-amber-800">
                Wybierz turnus, do którego należysz. Możesz go w każdej chwili przełączyć w aplikacji.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setTurnus('Turnus A')}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold transition ${
                    turnus === 'Turnus A'
                      ? 'bg-[#1b4332] text-white border-[#1b4332]'
                      : 'bg-white text-stone-700 border-stone-300'
                  }`}
                >
                  Turnus A
                </button>
                <button
                  type="button"
                  onClick={() => setTurnus('Turnus B')}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold transition ${
                    turnus === 'Turnus B'
                      ? 'bg-[#1b4332] text-white border-[#1b4332]'
                      : 'bg-white text-stone-700 border-stone-300'
                  }`}
                >
                  Turnus B
                </button>
              </div>
            </div>
          )}

          {/* 5. Grupa ćwiczeniowa / laboratoryjna */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
              4. Grupa laboratoryjna (opcjonalnie)
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {['Wszystkie', 'Grupa L1', 'Grupa L2'].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrupa(g)}
                  className={`py-2 px-2.5 rounded-lg border font-medium transition ${
                    grupa === g
                      ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:border-stone-300'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex items-center justify-between">
          <span className="text-xs text-stone-500">
            Zawsze możesz to zmienić klikając na górze planu.
          </span>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-[#2d6a4f] hover:bg-[#1b4332] text-white font-bold text-sm shadow-md transition active:scale-95"
          >
            Zapisz profil i zobacz plan
          </button>
        </div>
      </div>
    </div>
  );
};
