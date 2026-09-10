import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Movimiento, MetaAhorro, AppSettings } from './types';
import { MESES, DEFAULT_SETTINGS, INITIAL_METAS, getInitialMovements } from './data/initialData';
import { calculateResumen } from './utils/finance';
import { initAuth, getAccessToken } from './utils/firebaseAuth';
import { readAnySpreadsheet, writeAnySpreadsheet } from './utils/googleSheetsService';
import {
  subscribeUserMovimientos,
  subscribeUserMetas,
  subscribeUserSettings,
  saveUserMovimiento,
  deleteUserMovimiento,
  saveUserMeta,
  deleteUserMeta,
  saveUserSettings,
  batchSaveUserMovimientos,
  batchClearUserMovimientos,
} from './utils/firestoreService';
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

  // Data state with clean initial state
  const [movimientos, setMovimientos] = useState<Movimiento[]>(() => {
    try {
      const saved = localStorage.getItem('mis_finanzas_movimientos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
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
          return parsed;
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

  // Real-time Firestore sync when user is authenticated
  useEffect(() => {
    if (!user) return;

    // Movimientos listener
    const unsubMovs = subscribeUserMovimientos(user.uid, (firestoreMovs) => {
      // If Firestore has stored records for this user, keep local state in sync
      if (firestoreMovs.length > 0) {
        setMovimientos(firestoreMovs);
      }
    });

    // Metas listener
    const unsubMetas = subscribeUserMetas(user.uid, (firestoreMetas) => {
      if (firestoreMetas.length > 0) {
        setMetas(firestoreMetas);
      }
    });

    // Settings listener
    const unsubSettings = subscribeUserSettings(user.uid, (firestoreSettings) => {
      setSettings((prev) => ({ ...prev, ...firestoreSettings }));
    });

    return () => {
      unsubMovs();
      unsubMetas();
      unsubSettings();
    };
  }, [user]);

  // If connected to a Google Sheet or Excel file in Drive, pull latest records so app mirrors the spreadsheet
  useEffect(() => {
    if (!user || !settings.googleSheetId) return;

    let isMounted = true;
    setIsSyncing(true);
    getAccessToken()
      .then(async (token) => {
        if (!token || !settings.googleSheetId || !isMounted) return;
        const sheetMovements = await readAnySpreadsheet(
          token,
          settings.googleSheetId,
          settings.fileMimeType || settings.googleSpreadsheetTitle,
          settings.googleSheetName || 'Movimientos'
        );
        if (isMounted) {
          if (sheetMovements.length > 0) {
            setMovimientos(sheetMovements);
            if (user) {
              batchSaveUserMovimientos(user.uid, sheetMovements).catch((err) =>
                console.warn('Error mirroring sheets/Excel to Firestore:', err)
              );
            }
          }
          setSettings((prev) => ({
            ...prev,
            lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }));
        }
      })
      .catch((err) => {
        console.warn('Startup sync from Google Sheets/Excel:', err);
      })
      .finally(() => {
        if (isMounted) setIsSyncing(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user, settings.googleSheetId, settings.googleSheetName, settings.fileMimeType, settings.googleSpreadsheetTitle]);

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

  // Real-time auto-sync helper for both Excel and Google Sheets
  const syncToDriveIfEnabled = (updatedList: Movimiento[]) => {
    if (settings.autoSync && settings.googleSheetId) {
      setIsSyncing(true);
      getAccessToken().then((token) => {
        if (token && settings.googleSheetId) {
          writeAnySpreadsheet(
            token,
            settings.googleSheetId,
            updatedList,
            settings.fileMimeType || settings.googleSpreadsheetTitle,
            settings.googleSheetName || 'Movimientos'
          )
            .then(() => {
              setSettings((prev) => ({
                ...prev,
                lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              }));
            })
            .catch((err) => {
              console.warn('Error syncing movements to Drive/Sheets:', err);
            })
            .finally(() => {
              setIsSyncing(false);
            });
        } else {
          setIsSyncing(false);
        }
      });
    }
  };

  // Direct manual sync triggered from Dashboard or elsewhere
  const handleManualSync = async () => {
    if (!settings.googleSheetId) {
      showToast('Vincula tu archivo de Drive en la pestaña de Ajustes', 'info');
      setCurrentScreen('settings');
      return;
    }
    setIsSyncing(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        showToast('Inicia sesión con Google para sincronizar con Drive', 'error');
        setIsSyncing(false);
        return;
      }
      const remote = await readAnySpreadsheet(
        token,
        settings.googleSheetId,
        settings.fileMimeType || settings.googleSpreadsheetTitle,
        settings.googleSheetName || 'Movimientos'
      );

      // Merge without duplicates
      const map = new Map<string, Movimiento>();
      movimientos.forEach((m) => map.set(m.id, m));
      remote.forEach((m) => map.set(m.id, m));
      const merged = Array.from(map.values());

      setMovimientos(merged);

      // Update Drive/Excel
      await writeAnySpreadsheet(
        token,
        settings.googleSheetId,
        merged,
        settings.fileMimeType || settings.googleSpreadsheetTitle,
        settings.googleSheetName || 'Movimientos'
      );

      // Update Firestore if logged in
      if (user) {
        await batchSaveUserMovimientos(user.uid, merged);
      }

      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const updatedSettings = { ...settings, lastSyncedAt: timestamp };
      setSettings(updatedSettings);
      if (user) {
        saveUserSettings(user.uid, updatedSettings).catch(console.warn);
      }

      showToast(`¡Sincronizado con éxito! (${merged.length} movimientos)`, 'success');
    } catch (err: any) {
      console.error('Manual sync error:', err);
      showToast('Error al sincronizar: ' + (err.message || 'Verifica tu conexión'), 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handlers for movements
  const handleSaveMovement = (data: Omit<Movimiento, 'id'>, editId?: string) => {
    if (editId) {
      const updatedMovement: Movimiento = { ...data, id: editId };
      const updatedList = movimientos.map((m) => (m.id === editId ? updatedMovement : m));
      setMovimientos(updatedList);
      if (user) {
        saveUserMovimiento(user.uid, updatedMovement).catch((err) =>
          console.warn('Error saving movement to Firestore:', err)
        );
      }
      showToast('Movimiento actualizado', 'success');
      syncToDriveIfEnabled(updatedList);
    } else {
      const newMovement: Movimiento = {
        ...data,
        id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      };
      const updatedList = [...movimientos, newMovement];
      setMovimientos(updatedList);
      if (user) {
        saveUserMovimiento(user.uid, newMovement).catch((err) =>
          console.warn('Error saving new movement to Firestore:', err)
        );
      }
      showToast('Movimiento guardado', 'success');
      syncToDriveIfEnabled(updatedList);

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
    const updatedList = [...movimientos, duplicate];
    setMovimientos(updatedList);
    if (user) {
      saveUserMovimiento(user.uid, duplicate).catch((err) =>
        console.warn('Error saving duplicate to Firestore:', err)
      );
    }
    showToast('Movimiento duplicado', 'info');
    syncToDriveIfEnabled(updatedList);
  };

  const handleDeleteMovement = (id: string) => {
    const updatedList = movimientos.filter((m) => m.id !== id);
    setMovimientos(updatedList);
    if (user) {
      deleteUserMovimiento(user.uid, id).catch((err) =>
        console.warn('Error deleting movement from Firestore:', err)
      );
    }
    showToast('Movimiento eliminado', 'info');
    syncToDriveIfEnabled(updatedList);
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
    if (user) {
      saveUserMeta(user.uid, goal).catch((err) =>
        console.warn('Error saving goal to Firestore:', err)
      );
    }
    showToast('Meta de ahorro guardada', 'success');
  };

  const handleDeleteGoal = (id: string) => {
    setMetas((prev) => prev.filter((g) => g.id !== id));
    if (user) {
      deleteUserMeta(user.uid, id).catch((err) =>
        console.warn('Error deleting goal from Firestore:', err)
      );
    }
    showToast('Meta eliminada', 'info');
  };

  const handleContributeToGoal = (goalId: string, amount: number) => {
    const goal = metas.find((g) => g.id === goalId);
    if (!goal) return;

    const updatedGoal: MetaAhorro = { ...goal, acumulado: goal.acumulado + amount };
    setMetas((prev) =>
      prev.map((g) => (g.id === goalId ? updatedGoal : g))
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

    if (user) {
      saveUserMeta(user.uid, updatedGoal).catch((err) =>
        console.warn('Error saving goal progress to Firestore:', err)
      );
      saveUserMovimiento(user.uid, newMov).catch((err) =>
        console.warn('Error saving goal movement to Firestore:', err)
      );
    }
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
      if (user) {
        batchClearUserMovimientos(user.uid).catch((err) =>
          console.warn('Error clearing movements in Firestore:', err)
        );
      }
      showToast('Todos los datos han sido borrados (en cero)', 'info');
    }
  };

  const handleImportData = (data: { movimientos: Movimiento[]; metas: MetaAhorro[] }) => {
    if (data.movimientos) setMovimientos(data.movimientos);
    if (data.metas) setMetas(data.metas);
    if (user && data.movimientos && data.movimientos.length > 0) {
      batchSaveUserMovimientos(user.uid, data.movimientos).catch((err) =>
        console.warn('Error saving imported data to Firestore:', err)
      );
    }
  };

  const handleImportMovements = (importedMovements: Movimiento[]) => {
    setMovimientos(importedMovements);
    if (user && importedMovements.length > 0) {
      batchSaveUserMovimientos(user.uid, importedMovements).catch((err) =>
        console.warn('Error saving imported movements to Firestore:', err)
      );
    }
    if (importedMovements.length > 0) {
      showToast(`Se cargaron ${importedMovements.length} movimientos desde Google Sheets`, 'success');
    }
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    if (user) {
      saveUserSettings(user.uid, newSettings).catch((err) =>
        console.warn('Error saving settings to Firestore:', err)
      );
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
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
            isSyncing={isSyncing}
            onTriggerSync={handleManualSync}
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
            onUpdateSettings={handleUpdateSettings}
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
