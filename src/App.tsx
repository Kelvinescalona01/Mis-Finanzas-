import React, { useState, useEffect } from 'react';
import { Movimiento, MetaAhorro, AppSettings } from './types';
import { MESES, DEFAULT_SETTINGS, INITIAL_METAS, getInitialMovements } from './data/initialData';
import { calculateResumen } from './utils/finance';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { HistoryView } from './components/HistoryView';
import { SavingsGoalsView } from './components/SavingsGoalsView';
import { SettingsView } from './components/SettingsView';
import { AddMovementModal } from './components/AddMovementModal';
import { ToastContainer, ToastMessage } from './components/Toast';

export const App: React.FC = () => {
  // Navigation & Month
  const [currentScreen, setCurrentScreen] = useState<'dashboard' | 'history' | 'goals' | 'settings'>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return MESES[new Date().getMonth()];
  });

  // Data state with localStorage persistence
  const [movimientos, setMovimientos] = useState<Movimiento[]>(() => {
    try {
      const saved = localStorage.getItem('mis_finanzas_movimientos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error reading localStorage', e);
    }
    return getInitialMovements();
  });

  const [metas, setMetas] = useState<MetaAhorro[]>(() => {
    try {
      const saved = localStorage.getItem('mis_finanzas_metas');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error reading localStorage', e);
    }
    return INITIAL_METAS;
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('mis_finanzas_settings');
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Error reading localStorage', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Modal & Toast states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<Movimiento | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Persist data whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('mis_finanzas_movimientos', JSON.stringify(movimientos));
    } catch (e) {
      console.error('Failed to save movements', e);
    }
  }, [movimientos]);

  useEffect(() => {
    try {
      localStorage.setItem('mis_finanzas_metas', JSON.stringify(metas));
    } catch (e) {
      console.error('Failed to save goals', e);
    }
  }, [metas]);

  useEffect(() => {
    try {
      localStorage.setItem('mis_finanzas_settings', JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }, [settings]);

  // Toast dispatcher
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Financial summary for selected month
  const resumen = calculateResumen(movimientos, selectedMonth);

  // Handlers for movements
  const handleSaveMovement = (data: Omit<Movimiento, 'id'>, editId?: string) => {
    if (editId) {
      setMovimientos((prev) =>
        prev.map((m) => (m.id === editId ? { ...data, id: editId } : m))
      );
      showToast('Movimiento actualizado', 'success');
    } else {
      const newMovement: Movimiento = {
        ...data,
        id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      };
      setMovimientos((prev) => [...prev, newMovement]);
      showToast('Movimiento guardado exitosamente', 'success');
      // If movement month is different from current, switch to it to show the change
      if (data.mes && data.mes !== selectedMonth) {
        setSelectedMonth(data.mes);
      }
    }
    setEditingMovement(null);
  };

  const handleEditMovement = (mov: Movimiento) => {
    setEditingMovement(mov);
    setIsAddModalOpen(true);
  };

  const handleDuplicateMovement = (mov: Movimiento) => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const duplicate: Movimiento = {
      ...mov,
      id: `mov-${Date.now()}`,
      fecha: todayStr,
      mes: selectedMonth,
      concepto: `${mov.concepto} (Copia)`,
    };
    setMovimientos((prev) => [...prev, duplicate]);
    showToast('Movimiento duplicado', 'info');
  };

  const handleDeleteMovement = (id: string) => {
    setMovimientos((prev) => prev.filter((m) => m.id !== id));
    showToast('Movimiento eliminado', 'info');
  };

  // Handlers for goals
  const handleSaveGoal = (goal: MetaAhorro) => {
    setMetas((prev) => {
      const exists = prev.some((g) => g.id === goal.id);
      if (exists) {
        return prev.map((g) => (g.id === goal.id ? goal : g));
      }
      return [...prev, goal];
    });
    showToast('Meta de ahorro guardada', 'success');
  };

  const handleDeleteGoal = (id: string) => {
    setMetas((prev) => prev.filter((g) => g.id !== id));
    showToast('Meta eliminada', 'info');
  };

  const handleContributeToGoal = (goalId: string, amount: number) => {
    const goal = metas.find((g) => g.id === goalId);
    if (!goal) return;

    setMetas((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, acumulado: g.acumulado + amount } : g))
    );

    // Also register an Ahorro movement
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const newMov: Movimiento = {
      id: `mov-${Date.now()}`,
      fecha: todayStr,
      mes: selectedMonth,
      tipo: 'Ahorro',
      concepto: `Aporte a ${goal.nombre}`,
      necesidad: 'Ahorros',
      monto: amount,
      notas: 'Aporte registrado desde Metas',
    };
    setMovimientos((prev) => [...prev, newMov]);
    showToast(`Se agregaron $${amount} a ${goal.nombre}`, 'success');
  };

  const handleResetSampleData = () => {
    setMovimientos(getInitialMovements());
    setMetas(INITIAL_METAS);
    showToast('Datos de ejemplo cargados', 'info');
  };

  const handleClearAll = () => {
    if (window.confirm('¿Seguro que deseas borrar todos los movimientos y metas?')) {
      setMovimientos([]);
      setMetas([]);
      showToast('Todos los datos han sido borrados', 'info');
    }
  };

  const handleImportData = (data: { movimientos: Movimiento[]; metas: MetaAhorro[] }) => {
    if (data.movimientos) setMovimientos(data.movimientos);
    if (data.metas) setMetas(data.metas);
  };

  return (
    <div className="min-h-screen bg-[#EEF2EE] flex flex-col text-[#16241E]">
      <Navbar
        currentScreen={currentScreen}
        onSelectScreen={setCurrentScreen}
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
        onOpenAddModal={() => {
          setEditingMovement(null);
          setIsAddModalOpen(true);
        }}
      />

      <main className="flex-1 px-4 md:px-8 py-5 pb-24 md:pb-16 max-w-5xl mx-auto w-full">
        {currentScreen === 'dashboard' && (
          <DashboardView
            resumen={resumen}
            movimientos={movimientos}
            metas={metas}
            settings={settings}
            onOpenAddModal={() => {
              setEditingMovement(null);
              setIsAddModalOpen(true);
            }}
            onNavigateToHistory={() => setCurrentScreen('history')}
            onNavigateToGoals={() => setCurrentScreen('goals')}
          />
        )}

        {currentScreen === 'history' && (
          <HistoryView
            movimientos={movimientos}
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
            settings={settings}
            onOpenAddModal={() => {
              setEditingMovement(null);
              setIsAddModalOpen(true);
            }}
            onEditMovement={handleEditMovement}
            onDuplicateMovement={handleDuplicateMovement}
            onDeleteMovement={handleDeleteMovement}
          />
        )}

        {currentScreen === 'goals' && (
          <SavingsGoalsView
            metas={metas}
            onSaveGoal={handleSaveGoal}
            onDeleteGoal={handleDeleteGoal}
            onContributeToGoal={handleContributeToGoal}
            settings={settings}
          />
        )}

        {currentScreen === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={setSettings}
            movimientos={movimientos}
            metas={metas}
            onImportData={handleImportData}
            onResetSampleData={handleResetSampleData}
            onClearAll={handleClearAll}
            onShowToast={showToast}
          />
        )}
      </main>

      <AddMovementModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingMovement(null);
        }}
        onSave={handleSaveMovement}
        initialData={editingMovement}
        defaultMonth={selectedMonth}
        settings={settings}
      />

      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
};
