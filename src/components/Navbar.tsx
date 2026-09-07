import React from 'react';
import { LayoutDashboard, History, Target, Settings, Plus } from 'lucide-react';
import { MESES } from '../data/initialData';

interface NavbarProps {
  currentScreen: 'dashboard' | 'history' | 'goals' | 'settings';
  onSelectScreen: (screen: 'dashboard' | 'history' | 'goals' | 'settings') => void;
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  onOpenAddModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentScreen,
  onSelectScreen,
  selectedMonth,
  onSelectMonth,
  onOpenAddModal,
}) => {
  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#EEF2EE]/90 backdrop-blur-md border-b border-[#DCE3DC] px-4 md:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#16241E] flex items-center justify-center text-[#C9A227] font-semibold text-base shadow-sm">
            $
          </div>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-[#16241E] leading-none">
              Mis Finanzas
            </h1>
            <p className="text-[11px] text-[#6B776F] font-medium hidden sm:block">
              Regla 50/30/20 &amp; Control Inteligente
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            id="month-selector"
            aria-label="Seleccionar mes"
            value={selectedMonth}
            onChange={(e) => onSelectMonth(e.target.value)}
            className="bg-white text-[#16241E] font-medium text-sm border border-[#DCE3DC] rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#3E7C6B] shadow-xs cursor-pointer"
          >
            {MESES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <button
            onClick={onOpenAddModal}
            className="hidden sm:inline-flex items-center gap-1.5 bg-[#16241E] hover:bg-[#233830] text-white text-sm font-semibold px-3.5 py-1.5 rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 text-[#C9A227]" />
            <span>Movimiento</span>
          </button>
        </div>
      </header>

      {/* Floating Action Button for Mobile */}
      <button
        onClick={onOpenAddModal}
        className="sm:hidden fixed right-5 bottom-20 z-40 w-14 h-14 rounded-full bg-[#C9A227] text-[#16241E] shadow-xl flex items-center justify-center font-bold text-2xl hover:scale-105 active:scale-95 transition-all"
        aria-label="Agregar nuevo movimiento"
        title="Agregar nuevo movimiento"
      >
        <Plus className="w-7 h-7 stroke-[2.5]" />
      </button>

      {/* Bottom Bar Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#DCE3DC] px-2 py-1.5 flex justify-around items-center max-w-lg mx-auto md:max-w-none md:justify-center md:gap-8">
        <button
          onClick={() => onSelectScreen('dashboard')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium transition-colors ${
            currentScreen === 'dashboard'
              ? 'text-[#16241E] font-bold'
              : 'text-[#6B776F] hover:text-[#16241E]'
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 ${currentScreen === 'dashboard' ? 'text-[#3E7C6B]' : ''}`} />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => onSelectScreen('history')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium transition-colors ${
            currentScreen === 'history'
              ? 'text-[#16241E] font-bold'
              : 'text-[#6B776F] hover:text-[#16241E]'
          }`}
        >
          <History className={`w-5 h-5 ${currentScreen === 'history' ? 'text-[#3E7C6B]' : ''}`} />
          <span>Historial</span>
        </button>

        <button
          onClick={() => onSelectScreen('goals')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium transition-colors ${
            currentScreen === 'goals'
              ? 'text-[#16241E] font-bold'
              : 'text-[#6B776F] hover:text-[#16241E]'
          }`}
        >
          <Target className={`w-5 h-5 ${currentScreen === 'goals' ? 'text-[#3E7C6B]' : ''}`} />
          <span>Metas</span>
        </button>

        <button
          onClick={() => onSelectScreen('settings')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium transition-colors ${
            currentScreen === 'settings'
              ? 'text-[#16241E] font-bold'
              : 'text-[#6B776F] hover:text-[#16241E]'
          }`}
        >
          <Settings className={`w-5 h-5 ${currentScreen === 'settings' ? 'text-[#3E7C6B]' : ''}`} />
          <span>Ajustes</span>
        </button>
      </nav>
    </>
  );
};
