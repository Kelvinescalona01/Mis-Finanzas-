import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Movimiento, MetaAhorro, AppSettings } from './types';
import { MESES, DEFAULT_SETTINGS, INITIAL_METAS, getInitialMovements } from './data/initialData';
import { calculateResumen } from './utils/finance';
import { initAuth, getAccessToken } from './utils/firebaseAuth';
import { appendMovementToGoogleSheet, readMovementsFromGoogleSheet } from './utils/googleSheetsService';
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

  // Google / Firebase Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      (u) => setUser(u),
      () => setUser(null)
    );
    return () => unsubscribe();
  }, []);

  // Data state with clean initial state (all months start at zero unless Google Sheets has data)
  const [movimientos, setMovimientos] = useState<Movimiento[]>(() => {
    try {
      const saved = localStorage.getItem('mis_finanzas_movimientos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Detect and wipe old mock sample items
          const hasOldMockData = parsed.some(
            (m: any) =>
              (typeof m.id === 'string' && m.id.startsWith('mov-')) ||
              m.concepto === 'Sueldo Quincenal (1ra Quincena)'
          );
          if (!hasOldMockData) {
            return parsed;
          }
          localStorage.removeItem('mis_finanzas_movimientos');
        }
      }
    } catch (e) {
      console.error('Error reading localStorage', e);
    }
    return [];
  });

  const [metas, setMetas] = useState<MetaAhorro[]>(() => {
    try {
      const saved = localStorage.getItem('mis_finanzas_metas');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const hasOldMockMetas = parsed.some(
            (m: any) =>
              (typeof m.id === 'string' && m.id.startsWith('meta-')) ||
              m.nombre?.includes('Fondo de Emergencia (6 meses)')
          );
          if (!hasOldMockMetas) {
            return parsed;
          }
          localStorage.removeItem('mis_finanzas_metas');
        }
      }
    } catch (e) {
      console.error('Error reading localStorage', e);
    }
    return [];
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

  // If connected to a Google Sheet, pull latest records from Drive so app mirrors the spreadsheet
  useEffect(() => {
    if (!user || !settings.googleSheetId) return;

    let isMounted = true;
    setIsSyncing(true);
    getAccessToken()
      .then(async (token) => {
        if (!token || !settings.googleSheetId || !isMounted) return;
        const sheetMovements = await readMovementsFromGoogleSheet(
          token,
          settings.googleSheetId,
          settings.googleSheetName || 'Movimientos'
        );
        if (isMounted) {
          setMovimientos(sheetMovements);
          setSettings((prev) => ({
            ...prev,
            lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }));
        }
      })
      .catch((err) => {
        console.warn('Startup sync from Google Sheets:', err);
      })
      .finally(() => {
        if (isMounted) setIsSyncing(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user, settings.googleSheetId, settings.googleSheetName]);

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
      const updatedMovement: Movimiento = { ...data, id: editId };
      setMovimientos((prev) =>
        prev.map((m) => (m.id === editId ? updatedMovement : m))
      );
      showToast('Movimiento actualizado', 'success');

      // Real-time sync if connected to Google Sheets
      if (settings.autoSync && settings.googleSheetId) {
        setIsSyncing(true);
        getAccessToken().then((token) => {
          if (token && settings.googleSheetId) {
            appendMovementToGoogleSheet(
              token,
              settings.googleSheetId,
              updatedMovement,
              settings.googleSheetName || 'Movimientos'
            )
              .then(() => {
                setSettings((prev) => ({
                  ...prev,
                  lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                }));
              })
              .catch((err) => {
                console.warn('Error syncing updated movement to Google Sheets:', err);
              })
              .finally(() => {
                setIsSyncing(false);
              });
          } else {
            setIsSyncing(false);
          }
        });
      }
    } else {
      const newMovement: Movimiento = {
        ...data,
        id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      };
      setMovimientos((prev) => [...prev, newMovement]);
      showToast('Movimiento guardado', 'success');

      // Real-time sync if connected to Google Sheets
      if (settings.autoSync && settings.googleSheetId) {
        setIsSyncing(true);
        getAccessToken().then((token) => {
          if (token && settings.googleSheetId) {
            appendMovementToGoogleSheet(
              token,
              settings.googleSheetId,
              newMovement,
              settings.googleSheetName || 'Movimientos'
            )
              .then(() => {
                setSettings((prev) => ({
                  ...prev,
                  lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                }));
              })
              .catch((err) => {
                console.warn('Error syncing new movement to Google Sheets:', err);
              })
              .finally(() => {
                setIsSyncing(false);
              });
          } else {
            setIsSyncing(false);
          }
        });
      }

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
    setMovimientos([]);
    setMetas([]);
    showToast('Todos los datos se han reiniciado a cero', 'info');
  };

  const handleClearAll = () => {
    if (window.confirm('¿Seguro que deseas borrar todos los movimientos y metas y dejarlos en cero?')) {
      setMovimientos([]);
      setMetas([]);
      showToast('Todos los datos han sido borrados (en cero)', 'info');
    }
  };

  const handleImportData = (data: { movimientos: Movimiento[]; metas: MetaAhorro[] }) => {
    if (data.movimientos) setMovimientos(data.movimientos);
    if (data.metas) setMetas(data.metas);
  };

  const handleImportMovements = (importedMovements: Movimiento[]) => {
    setMovimientos(importedMovements);
    if (importedMovements.length > 0) {
      showToast(`Se cargaron ${importedMovements.length} movimientos desde Google Sheets`, 'success');
    }
  };

  return (
    <div className="min-h-screen bg-[#EEF2EE] flex flex-col text-[#16241E]">
      <Navbar
        currentScreen={currentScreen}
        onSelectScreen={setCurrentScreen}
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
        isLinkedToSheets={Boolean(settings.googleSheetId)}
        isSyncing={isSyncing}
        sheetTitle={settings.googleSpreadsheetTitle}
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
            isSyncing={isSyncing}
            onOpenAddModal={() => {
              setEditingMovement(null);
              setIsAddModalOpen(true);
            }}
            onNavigateToHistory={() => setCurrentScreen('history')}
            onNavigateToGoals={() => setCurrentScreen('goals')}
            onNavigateToSettings={() => setCurrentScreen('settings')}
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
            onImportMovements={handleImportMovements}
            onResetSampleData={handleResetSampleData}
            onClearAll={handleClearAll}
            onShowToast={showToast}
            user={user}
            onUserChange={setUser}
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
