import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  PlusCircle,
  LogOut,
  FolderOpen,
  CloudCheck,
  ShieldAlert,
  Sparkles,
  Search,
  Check,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { AppSettings, Movimiento, GoogleDriveFile } from '../types';
import {
  googleSignIn,
  googleSignOut,
  initAuth,
  getAccessToken,
} from '../utils/firebaseAuth';
import {
  listDriveSpreadsheets,
  searchPresupuestoFileInDrive,
  prepareSpreadsheetForRealtimeSync,
  getSpreadsheetDetails,
  createDefaultSpreadsheet,
  readMovementsFromGoogleSheet,
  syncAllMovementsToGoogleSheet,
  extractSpreadsheetId,
} from '../utils/googleSheetsService';

interface GoogleSheetsIntegrationProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  movimientos: Movimiento[];
  onImportMovements: (movements: Movimiento[]) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  user: User | null;
  onUserChange: (user: User | null) => void;
}

export const GoogleSheetsIntegration: React.FC<GoogleSheetsIntegrationProps> = ({
  settings,
  onUpdateSettings,
  movimientos,
  onImportMovements,
  onShowToast,
  user,
  onUserChange,
}) => {
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isActionPending, setIsActionPending] = useState(false);
  const [customSheetInput, setCustomSheetInput] = useState('');
  
  // Dedicated state for Presupuesto_Mensual_50_30_20.xlsx
  const [presupuestoFile, setPresupuestoFile] = useState<GoogleDriveFile | null>(null);
  const [isSearchingPresupuesto, setIsSearchingPresupuesto] = useState(false);
  const [hasSearchedPresupuesto, setHasSearchedPresupuesto] = useState(false);

  // Confirmation modal state for mutating/overwriting data in Google Sheets
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  // Link any Drive file and prepare for real-time sync
  const handleLinkDriveFile = useCallback(
    async (file: GoogleDriveFile) => {
      const token = await getAccessToken();
      if (!token) {
        onShowToast('Inicia sesión con Google para vincular el archivo', 'info');
        return;
      }

      setIsActionPending(true);
      try {
        const prepared = await prepareSpreadsheetForRealtimeSync(token, file);
        const details = await getSpreadsheetDetails(token, prepared.id);
        const targetTab =
          details.sheets.find((s) => s.title.toLowerCase() === 'movimientos')?.title ||
          details.sheets[0]?.title ||
          'Movimientos';

        onUpdateSettings({
          ...settings,
          googleSheetId: prepared.id,
          googleSpreadsheetTitle: file.name,
          googleSheetName: targetTab,
          googleDriveWebViewLink: prepared.webViewLink,
          autoSync: true,
        });

        // Auto-import existing movements from the sheet
        try {
          const existing = await readMovementsFromGoogleSheet(token, prepared.id, targetTab);
          onImportMovements(existing);
        } catch (e) {
          console.warn('Could not auto-import movements:', e);
        }

        onShowToast(
          `¡Enlazado con "${file.name}" en tiempo real!`,
          'success'
        );
      } catch (err: any) {
        console.error('Error linking file:', err);
        onShowToast(`Error al enlazar: ${err.message}`, 'error');
      } finally {
        setIsActionPending(false);
      }
    },
    [settings, onUpdateSettings, onImportMovements, onShowToast]
  );

  // Search specifically for Presupuesto_Mensual_50_30_20.xlsx in user's Drive
  const handleSearchPresupuesto = useCallback(
    async (autoLinkIfFound = false) => {
      const token = await getAccessToken();
      if (!token) {
        onShowToast('Inicia sesión con Google para buscar en tu Drive', 'info');
        return;
      }

      setIsSearchingPresupuesto(true);
      try {
        const { targetFile, allMatches } = await searchPresupuestoFileInDrive(token);
        setHasSearchedPresupuesto(true);
        setPresupuestoFile(targetFile);

        if (allMatches.length > 0) {
          setDriveFiles((prev) => {
            const combined = [...allMatches];
            for (const f of prev) {
              if (!combined.some((c) => c.id === f.id)) combined.push(f);
            }
            return combined;
          });
        }

        if (targetFile) {
          if (autoLinkIfFound && !settings.googleSheetId) {
            await handleLinkDriveFile(targetFile);
          }
        }
      } catch (err: any) {
        console.warn('Error searching Presupuesto_Mensual_50_30_20:', err);
      } finally {
        setIsSearchingPresupuesto(false);
      }
    },
    [settings.googleSheetId, handleLinkDriveFile]
  );

  // Check auth state on load
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser) => {
        onUserChange(currentUser);
        // Auto-search for Presupuesto file once user is detected
        if (currentUser && !settings.googleSheetId) {
          handleSearchPresupuesto(false);
        }
      },
      () => {
        onUserChange(null);
      }
    );
    return () => unsubscribe();
  }, [onUserChange, settings.googleSheetId, handleSearchPresupuesto]);

  // Load files from Google Drive when authenticated
  const handleFetchDriveFiles = async () => {
    const token = await getAccessToken();
    if (!token) {
      onShowToast('Inicia sesión con Google para buscar tus hojas de cálculo en Drive', 'info');
      return;
    }

    setIsLoadingFiles(true);
    try {
      const files = await listDriveSpreadsheets(token);
      setDriveFiles(files);
      if (files.length === 0) {
        onShowToast('No se encontraron hojas de cálculo en Drive. Puedes crear una nueva.', 'info');
      }
    } catch (err: any) {
      console.error('Error fetching drive spreadsheets:', err);
      onShowToast(`Error al explorar Drive: ${err.message}`, 'error');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const res = await googleSignIn();
      if (!res) {
        // The user closed the popup window or canceled selection without completing auth
        return;
      }
      onUserChange(res.user);
      onShowToast(`Sesión iniciada como ${res.user.displayName || res.user.email}`, 'success');
      // Search and link Presupuesto_Mensual_50_30_20 right away
      await handleSearchPresupuesto(true);
    } catch (err: any) {
      console.warn('Sign-in notice:', err?.message || err);
      onShowToast(`No se pudo iniciar sesión: ${err.message || 'Error de conexión'}`, 'error');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await googleSignOut();
      onUserChange(null);
      setDriveFiles([]);
      setPresupuestoFile(null);
      setHasSearchedPresupuesto(false);
      onShowToast('Sesión de Google cerrada', 'info');
    } catch (err: any) {
      onShowToast(`Error al cerrar sesión: ${err.message}`, 'error');
    }
  };

  // Select an existing spreadsheet
  const handleSelectSpreadsheet = async (sheetId: string, sheetTitle?: string) => {
    const cleanId = extractSpreadsheetId(sheetId);
    if (!cleanId) {
      onShowToast('ID o URL de hoja de cálculo inválida', 'error');
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      onShowToast('Inicia sesión con Google para vincular la hoja', 'info');
      return;
    }

    // If matches a known driveFile, use handleLinkDriveFile
    const existingFile = driveFiles.find((f) => f.id === cleanId);
    if (existingFile) {
      await handleLinkDriveFile(existingFile);
      setCustomSheetInput('');
      return;
    }

    setIsActionPending(true);
    try {
      const details = await getSpreadsheetDetails(token, cleanId);
      const targetTab = details.sheets.find((s) => s.title === 'Movimientos')?.title || details.sheets[0]?.title || 'Movimientos';

      onUpdateSettings({
        ...settings,
        googleSheetId: cleanId,
        googleSpreadsheetTitle: details.title || sheetTitle || 'Hoja de Cálculo',
        googleSheetName: targetTab,
        googleDriveWebViewLink: details.webViewLink,
        autoSync: true,
      });

      // Auto-import existing movements from the sheet
      try {
        const existing = await readMovementsFromGoogleSheet(token, cleanId, targetTab);
        onImportMovements(existing);
      } catch (e) {
        console.warn('Could not auto-import movements:', e);
      }

      onShowToast(`Vinculado a "${details.title}" en Google Drive`, 'success');
      setCustomSheetInput('');
    } catch (err: any) {
      console.error('Error selecting sheet:', err);
      onShowToast(`Error al conectar con la hoja: ${err.message}`, 'error');
    } finally {
      setIsActionPending(false);
    }
  };

  // Create a brand new Google Spreadsheet in Google Drive
  const handleCreateNewSheet = async () => {
    const token = await getAccessToken();
    if (!token) {
      onShowToast('Inicia sesión con Google para crear la hoja en Drive', 'info');
      return;
    }

    setIsActionPending(true);
    try {
      const created = await createDefaultSpreadsheet(token, 'Mis Finanzas 50/30/20');
      onUpdateSettings({
        ...settings,
        googleSheetId: created.id,
        googleSpreadsheetTitle: created.title,
        googleSheetName: 'Movimientos',
        googleDriveWebViewLink: created.webViewLink,
        autoSync: true,
      });

      onShowToast('¡Hoja "Mis Finanzas 50/30/20" creada con éxito en Google Drive!', 'success');
      // Sync initial sample/current movements to the newly created sheet
      if (movimientos.length > 0) {
        await syncAllMovementsToGoogleSheet(token, created.id, movimientos, 'Movimientos');
      }
      handleFetchDriveFiles();
    } catch (err: any) {
      console.error('Error creating spreadsheet:', err);
      onShowToast(`Error al crear la hoja: ${err.message}`, 'error');
    } finally {
      setIsActionPending(false);
    }
  };

  // Pull / Import movements from Google Sheets
  const handlePullFromSheet = async () => {
    if (!settings.googleSheetId) {
      onShowToast('Primero selecciona o vincula una hoja de Google Sheets', 'info');
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      onShowToast('Por favor vuelve a iniciar sesión con Google para sincronizar', 'info');
      return;
    }

    setIsActionPending(true);
    try {
      const pulled = await readMovementsFromGoogleSheet(
        token,
        settings.googleSheetId,
        settings.googleSheetName || 'Movimientos'
      );

      if (pulled.length === 0) {
        onShowToast('La hoja de Google Sheets no tiene movimientos registrados todavía.', 'info');
      } else {
        onImportMovements(pulled);
        onUpdateSettings({
          ...settings,
          lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        });
        onShowToast(`Se importaron ${pulled.length} movimientos desde Google Sheets`, 'success');
      }
    } catch (err: any) {
      console.error('Error pulling from Google Sheets:', err);
      onShowToast(`Error al leer de Google Sheets: ${err.message}`, 'error');
    } finally {
      setIsActionPending(false);
    }
  };

  // Push / Export all local movements to Google Sheets with required confirmation
  const handlePushAllToSheet = () => {
    if (!settings.googleSheetId) {
      onShowToast('Primero vincula una hoja de cálculo', 'info');
      return;
    }

    setConfirmationModal({
      isOpen: true,
      title: '¿Sincronizar y actualizar hoja en Google Drive?',
      description: `Se enviarán ${movimientos.length} movimientos a la hoja "${settings.googleSpreadsheetTitle || 'Google Sheets'}". Los datos de la pestaña "${settings.googleSheetName || 'Movimientos'}" se actualizarán con el estado actual de la app web.`,
      onConfirm: async () => {
        setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
        const token = await getAccessToken();
        if (!token) {
          onShowToast('Inicia sesión con Google para completar la sincronización', 'info');
          return;
        }

        setIsActionPending(true);
        try {
          const res = await syncAllMovementsToGoogleSheet(
            token,
            settings.googleSheetId!,
            movimientos,
            settings.googleSheetName || 'Movimientos'
          );
          onUpdateSettings({
            ...settings,
            lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          });
          onShowToast(`¡${res.count} movimientos sincronizados en tiempo real con Google Sheets!`, 'success');
        } catch (err: any) {
          console.error('Error syncing all:', err);
          onShowToast(`Error al sincronizar: ${err.message}`, 'error');
        } finally {
          setIsActionPending(false);
        }
      },
    });
  };

  return (
    <div className="bg-white border border-[#DCE3DC] rounded-2xl p-5 md:p-6 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#DCE3DC]">
        <div>
          <h2 className="font-display text-base md:text-lg font-bold text-[#16241E] flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#3E7C6B]" />
            <span>Google Drive y Google Sheets en Tiempo Real</span>
          </h2>
          <p className="text-xs text-[#6B776F] mt-1">
            Conecta tu cuenta de Google para recopilar y reflejar tus ingresos y gastos en tiempo real en tu hoja de cálculo.
          </p>
        </div>

        {/* Auth Button or User Profile */}
        <div>
          {user ? (
            <div className="flex items-center gap-2.5 bg-[#FAFBF9] border border-[#DCE3DC] px-3 py-1.5 rounded-xl">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Usuario'}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full object-cover border border-[#DCE3DC]"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#3E7C6B] text-white flex items-center justify-center text-xs font-bold">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="text-left">
                <p className="text-xs font-semibold text-[#16241E] leading-tight line-clamp-1">
                  {user.displayName || 'Usuario Google'}
                </p>
                <p className="text-[10px] text-[#6B776F] line-clamp-1">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                title="Cerrar sesión de Google"
                className="p-1 text-[#6B776F] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="gsi-material-button shadow-xs"
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    style={{ display: 'block' }}
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    ></path>
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    ></path>
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    ></path>
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    ></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents">
                  {isSigningIn ? 'Iniciando sesión...' : 'Conectar con Google'}
                </span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Target Excel File Locator Card: Presupuesto_Mensual_50_30_20.xlsx */}
      <div className="border border-[#3E7C6B]/40 bg-[#F4F7F4] rounded-2xl p-4 md:p-5 space-y-3.5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#3E7C6B]/15 text-[#233830]">
                <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
                <span>Archivo Objetivo de Drive</span>
              </span>
              <span className="text-xs font-mono font-bold text-[#16241E] bg-white px-2 py-0.5 rounded border border-[#DCE3DC]">
                Presupuesto_Mensual_50_30_20.xlsx
              </span>
            </div>
            <p className="text-xs text-[#4D5751] leading-relaxed">
              Ubica y enlaza este archivo Excel en tu cuenta de Google Drive para que la app web registre tus movimientos en tiempo real en él.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSearchPresupuesto(false)}
              disabled={!user || isSearchingPresupuesto || isActionPending}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-white border border-[#DCE3DC] hover:bg-[#EEF2EE] text-[#16241E] shadow-2xs transition-colors disabled:opacity-50"
            >
              <Search className={`w-3.5 h-3.5 ${isSearchingPresupuesto ? 'animate-spin' : 'text-[#3E7C6B]'}`} />
              <span>{isSearchingPresupuesto ? 'Buscando en Drive...' : 'Buscar en mi Drive'}</span>
            </button>

            {presupuestoFile && settings.googleSheetId !== presupuestoFile.id && (
              <button
                type="button"
                onClick={() => handleLinkDriveFile(presupuestoFile)}
                disabled={isActionPending}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-[#3E7C6B] hover:bg-[#2F5F52] text-white shadow-2xs transition-colors disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Enlazar ahora</span>
              </button>
            )}
          </div>
        </div>

        {/* State feedback for Presupuesto_Mensual_50_30_20 */}
        {settings.googleSpreadsheetTitle?.toLowerCase().includes('presupuesto_mensual_50_30_20') ||
        (settings.googleSheetId && settings.googleSheetId === presupuestoFile?.id) ? (
          <div className="bg-white/90 border border-emerald-300 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-950 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>¡Conectado y sincronizando en vivo!</strong> Cada movimiento que guardes se registrará al instante en tu archivo{' '}
                <code className="bg-emerald-50 px-1 py-0.5 rounded text-emerald-800 font-bold font-mono">
                  {settings.googleSpreadsheetTitle}
                </code>{' '}
                (pestaña <span className="font-semibold">"{settings.googleSheetName || 'Movimientos'}"</span>).
              </span>
            </div>
            {settings.googleDriveWebViewLink && (
              <a
                href={settings.googleDriveWebViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#3E7C6B] hover:underline shrink-0 font-bold inline-flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
              >
                <span>Abrir en Drive</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        ) : presupuestoFile ? (
          <div className="bg-white border border-[#DCE3DC] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-[#16241E] flex items-center gap-1.5">
                  <span>Encontrado en tu Google Drive:</span>
                  <span className="font-mono text-emerald-800">{presupuestoFile.name}</span>
                </p>
                <p className="text-[11px] text-[#6B776F]">
                  ID: {presupuestoFile.id} • {presupuestoFile.mimeType.includes('spreadsheet') ? 'Google Spreadsheet' : 'Excel (.xlsx)'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleLinkDriveFile(presupuestoFile)}
              disabled={isActionPending}
              className="text-xs font-bold text-white bg-[#16241E] hover:bg-[#233830] px-3.5 py-1.5 rounded-lg transition-colors shrink-0 flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5 text-[#C9A227]" />
              <span>Enlazar este archivo y activar en tiempo real</span>
            </button>
          </div>
        ) : hasSearchedPresupuesto ? (
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">
                No encontramos aún el archivo llamado exactamente "Presupuesto_Mensual_50_30_20.xlsx" en la búsqueda rápida de tu Drive.
              </p>
              <p className="text-[11px] text-amber-800/90 leading-relaxed">
                Si ya lo tienes en tu computadora o en una carpeta de Drive, puedes subirlo en <a href="https://drive.google.com" target="_blank" rel="noopener noreferrer" className="underline font-bold">drive.google.com</a> y pulsar <b>"Buscar en mi Drive"</b>, o copiar su enlace/URL y pegarlo en la casilla de abajo.
              </p>
            </div>
          </div>
        ) : !user ? (
          <div className="bg-white/70 border border-[#DCE3DC] rounded-xl p-3 text-xs text-[#6B776F] flex items-center justify-between">
            <span>Inicia sesión con tu cuenta de Google arriba para navegar en tu Drive y ubicar tu archivo.</span>
          </div>
        ) : null}
      </div>

      {/* Active Linked Spreadsheet Banner */}
      {settings.googleSheetId ? (
        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CloudCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="text-xs font-bold text-emerald-900">
                Vinculado a: {settings.googleSpreadsheetTitle || 'Hoja de Cálculo'}
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                Pestaña: {settings.googleSheetName || 'Movimientos'}
              </span>
            </div>
            <p className="text-[11px] text-emerald-800/80">
              {settings.autoSync
                ? '⚡ Sincronización en tiempo real activa. Cada movimiento que agregues se registrará de inmediato.'
                : 'Sincronización manual activa.'}
              {settings.lastSyncedAt && ` (Última sincronización: ${settings.lastSyncedAt})`}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {settings.googleDriveWebViewLink && (
              <a
                href={settings.googleDriveWebViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[#3E7C6B] hover:text-[#233830] font-semibold bg-white border border-[#DCE3DC] px-3 py-1.5 rounded-lg shadow-2xs hover:bg-[#FAFBF9] transition-colors"
              >
                <span>Abrir en Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={handlePullFromSheet}
              disabled={isActionPending}
              className="inline-flex items-center gap-1.5 text-xs text-[#16241E] font-semibold bg-white border border-[#DCE3DC] px-3 py-1.5 rounded-lg shadow-2xs hover:bg-[#FAFBF9] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isActionPending ? 'animate-spin' : ''}`} />
              <span>Importar de Drive</span>
            </button>
            <button
              type="button"
              onClick={handlePushAllToSheet}
              disabled={isActionPending}
              className="inline-flex items-center gap-1.5 text-xs text-white font-semibold bg-[#3E7C6B] hover:bg-[#2F5F52] px-3.5 py-1.5 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
            >
              <span>Sincronizar ahora</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#FAFBF9] border border-dashed border-[#DCE3DC] rounded-xl p-4 text-center space-y-1">
          <p className="text-xs font-semibold text-[#16241E]">
            No tienes ninguna hoja de Google Sheets vinculada actualmente.
          </p>
          <p className="text-[11px] text-[#6B776F]">
            Crea una nueva hoja automática o selecciona un archivo existente en tu Google Drive para comenzar la sincronización en tiempo real.
          </p>
        </div>
      )}

      {/* Connection & Selection Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Option 1: Create New Sheet in Drive */}
        <div className="border border-[#DCE3DC] rounded-xl p-4 bg-[#FAFBF9] flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-[#16241E] flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-[#3E7C6B]" />
              <span>Crear hoja nueva en tu Google Drive</span>
            </h3>
            <p className="text-[11px] text-[#6B776F] leading-relaxed">
              Crea automáticamente la hoja <b>"Mis Finanzas 50/30/20"</b> con el formato organizado por columnas (Fecha, Mes, Tipo, Concepto, Regla 50/30/20, Monto, Notas) y pestañas mensuales.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCreateNewSheet}
            disabled={!user || isActionPending}
            className="w-full bg-[#16241E] hover:bg-[#233830] text-white text-xs font-semibold py-2 px-3 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4 text-[#C9A227]" />
            <span>Crear hoja en mi Google Drive</span>
          </button>
        </div>

        {/* Option 2: Explore Drive Files */}
        <div className="border border-[#DCE3DC] rounded-xl p-4 bg-[#FAFBF9] flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-[#16241E] flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4 text-[#C9A227]" />
              <span>Seleccionar de mis archivos de Drive</span>
            </h3>
            <p className="text-[11px] text-[#6B776F] leading-relaxed">
              Busca tus hojas de cálculo existentes o archivos Excel cargados en tu cuenta de Google Drive para enlazarlos.
            </p>
          </div>
          <button
            type="button"
            onClick={handleFetchDriveFiles}
            disabled={!user || isLoadingFiles}
            className="w-full border border-[#DCE3DC] bg-white hover:bg-[#EEF2EE] text-[#16241E] text-xs font-semibold py-2 px-3 rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
            <span>{isLoadingFiles ? 'Explorando Drive...' : 'Explorar hojas en Drive'}</span>
          </button>
        </div>
      </div>

      {/* List of Drive Spreadsheets found */}
      {driveFiles.length > 0 && (
        <div className="border border-[#DCE3DC] rounded-xl p-3.5 bg-white space-y-2">
          <h4 className="text-xs font-bold text-[#16241E] flex items-center justify-between">
            <span>Hojas encontradas en tu Google Drive ({driveFiles.length}):</span>
            <span className="text-[10px] text-[#6B776F] font-normal">Haz clic en una para vincularla</span>
          </h4>
          <div className="max-h-48 overflow-y-auto divide-y divide-[#EEF2EE] border border-[#EEF2EE] rounded-lg">
            {driveFiles.map((file) => {
              const isTargetFile = file.name.toLowerCase().includes('presupuesto_mensual_50_30_20');
              const isActive = settings.googleSheetId === file.id;

              return (
                <div
                  key={file.id}
                  className={`p-2.5 flex items-center justify-between transition-colors gap-2 ${
                    isTargetFile ? 'bg-emerald-50/50 hover:bg-emerald-50' : 'hover:bg-[#FAFBF9]'
                  }`}
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <FileSpreadsheet className={`w-4 h-4 shrink-0 ${isTargetFile ? 'text-[#3E7C6B]' : 'text-emerald-600'}`} />
                    <div className="truncate">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className={`text-xs truncate ${isTargetFile ? 'font-bold text-[#16241E]' : 'font-semibold text-[#16241E]'}`}>
                          {file.name}
                        </p>
                        {isTargetFile && (
                          <span className="text-[10px] bg-[#C9A227]/20 text-[#8F721A] font-bold px-1.5 py-0.2 rounded border border-[#C9A227]/40">
                            ⭐ Archivo Solicitado
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#6B776F]">
                        {file.modifiedTime ? `Modificado: ${new Date(file.modifiedTime).toLocaleDateString()}` : file.mimeType}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Activa</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleLinkDriveFile(file)}
                        disabled={isActionPending}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                          isTargetFile
                            ? 'bg-[#3E7C6B] hover:bg-[#2F5F52] text-white shadow-2xs'
                            : 'text-[#3E7C6B] hover:text-[#233830] bg-[#EEF2EE] hover:bg-[#DCE3DC]'
                        }`}
                      >
                        Vincular
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Option 3: Manual URL or ID input */}
      <div className="pt-1">
        <label className="block text-xs font-semibold text-[#16241E] mb-1">
          O escribe/pega el enlace directo o ID de tu hoja de Google Sheets
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customSheetInput}
            onChange={(e) => setCustomSheetInput(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5n... o ID"
            className="flex-1 bg-[#FAFBF9] border border-[#DCE3DC] rounded-xl px-3 py-2 text-xs text-[#16241E] focus:outline-none focus:ring-2 focus:ring-[#3E7C6B]"
          />
          <button
            type="button"
            onClick={() => handleSelectSpreadsheet(customSheetInput)}
            disabled={!customSheetInput.trim() || isActionPending}
            className="bg-[#16241E] hover:bg-[#233830] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-40"
          >
            Vincular
          </button>
        </div>
      </div>

      {/* Auto-Sync Toggle */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFBF9] border border-[#DCE3DC]">
        <div>
          <p className="text-xs font-bold text-[#16241E]">Sincronización en tiempo real automática</p>
          <p className="text-[11px] text-[#6B776F]">
            Al agregar o modificar un movimiento en la app web, se registrará de inmediato en la hoja de cálculo.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.autoSync}
            onChange={(e) =>
              onUpdateSettings({
                ...settings,
                autoSync: e.target.checked,
              })
            }
            className="sr-only peer"
          />
          <div className="w-10 h-5 bg-[#DCE3DC] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#DCE3DC] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#3E7C6B]"></div>
        </label>
      </div>

      {/* Destructive Operation Confirmation Modal */}
      {confirmationModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl border border-[#DCE3DC] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-[#16241E]">{confirmationModal.title}</h3>
                <p className="text-xs text-[#6B776F] leading-relaxed">
                  {confirmationModal.description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DCE3DC]">
              <button
                type="button"
                onClick={() => setConfirmationModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-3.5 py-2 text-xs font-semibold text-[#6B776F] hover:text-[#16241E] rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmationModal.onConfirm}
                className="px-4 py-2 text-xs font-semibold bg-[#3E7C6B] hover:bg-[#2F5F52] text-white rounded-xl shadow-xs transition-colors"
              >
                Confirmar y Sincronizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
