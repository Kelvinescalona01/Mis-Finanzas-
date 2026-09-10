import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Download,
  Upload,
  ArrowUpDown,
  Database,
  FileCode2,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { AppSettings, Movimiento, GoogleDriveFile } from '../types';
import {
  googleSignIn,
  googleSignOut,
  initAuth,
  getAccessToken,
  hasActiveAccessToken,
} from '../utils/firebaseAuth';
import {
  listDriveSpreadsheets,
  searchPresupuestoFileInDrive,
  prepareSpreadsheetForRealtimeSync,
  getSpreadsheetDetails,
  createDefaultSpreadsheet,
  readAnySpreadsheet,
  writeAnySpreadsheet,
  mergeMovements,
  convertDriveExcelToGoogleSpreadsheet,
  downloadMovementsAsExcel,
  parseLocalExcelFile,
  isExcelFile,
  extractSpreadsheetId,
} from '../utils/googleSheetsService';
import { UnauthorizedDomainModal } from './UnauthorizedDomainModal';

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
  const [actionLabel, setActionLabel] = useState<string>('');
  const [customSheetInput, setCustomSheetInput] = useState('');
  const [showUnauthorizedModal, setShowUnauthorizedModal] = useState(false);
  
  // Dedicated state for Presupuesto_Mensual_50_30_20.xlsx
  const [presupuestoFile, setPresupuestoFile] = useState<GoogleDriveFile | null>(null);
  const [isSearchingPresupuesto, setIsSearchingPresupuesto] = useState(false);
  const [hasSearchedPresupuesto, setHasSearchedPresupuesto] = useState(false);

  // File input ref for local Excel uploads
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Confirmation modal state for overwriting data in Google Sheets
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
      let token = await getAccessToken();
      if (!token) {
        try {
          const authRes = await googleSignIn();
          if (authRes) token = authRes.accessToken;
        } catch (e) {
          // handled by googleSignIn
        }
      }

      if (!token) {
        onShowToast('Inicia sesión con Google para vincular el archivo', 'info');
        return;
      }

      setIsActionPending(true);
      setActionLabel('Vinculando archivo...');
      try {
        const prepared = await prepareSpreadsheetForRealtimeSync(token, file);
        let targetTab = 'Movimientos';

        if (!prepared.isExcel) {
          try {
            const details = await getSpreadsheetDetails(token, prepared.id);
            targetTab =
              details.sheets.find((s) => s.title.toLowerCase() === 'movimientos')?.title ||
              details.sheets[0]?.title ||
              'Movimientos';
          } catch (e) {
            console.warn('Could not read sheets list, defaulting to Movimientos:', e);
          }
        }

        onUpdateSettings({
          ...settings,
          googleSheetId: prepared.id,
          googleSpreadsheetTitle: file.name,
          googleSheetName: targetTab,
          googleDriveWebViewLink: prepared.webViewLink,
          fileMimeType: file.mimeType,
          autoSync: true,
        });

        // Auto-import existing movements from the file
        try {
          setActionLabel('Leyendo datos iniciales...');
          const existing = await readAnySpreadsheet(token, prepared.id, file.mimeType || file.name, targetTab);
          if (existing.length > 0) {
            onImportMovements(existing);
            onShowToast(
              `¡Enlazado con "${file.name}"! Se cargaron ${existing.length} movimientos a la app y la base de datos.`,
              'success'
            );
          } else {
            onShowToast(`¡Enlazado con "${file.name}" en tiempo real!`, 'success');
          }
        } catch (e) {
          console.warn('Could not auto-import movements:', e);
          onShowToast(`¡Enlazado con "${file.name}"!`, 'success');
        }
      } catch (err: any) {
        console.error('Error linking file:', err);
        onShowToast(`Error al enlazar: ${err.message}`, 'error');
      } finally {
        setIsActionPending(false);
        setActionLabel('');
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
          } else {
            onShowToast(`Se encontró "${targetFile.name}" en tu Google Drive`, 'success');
          }
        } else {
          onShowToast('No se encontró Presupuesto_Mensual_50_30_20 en Drive. Puedes crearlo o subirlo.', 'info');
        }
      } catch (err: any) {
        console.warn('Error searching Presupuesto_Mensual_50_30_20:', err);
        onShowToast(`Error al buscar en Drive: ${err.message}`, 'error');
      } finally {
        setIsSearchingPresupuesto(false);
      }
    },
    [settings.googleSheetId, handleLinkDriveFile, onShowToast]
  );

  // Check auth state on load
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        onUserChange(currentUser);
        if (currentUser && !settings.googleSheetId && token) {
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
    let token = await getAccessToken();
    if (!token) {
      try {
        const res = await googleSignIn();
        if (res) token = res.accessToken;
      } catch (e) {
        // error handled in signIn
      }
    }

    if (!token) {
      onShowToast('Inicia sesión con Google para ver tus archivos en Drive', 'info');
      return;
    }

    setIsLoadingFiles(true);
    try {
      const files = await listDriveSpreadsheets(token);
      setDriveFiles(files);
      if (files.length === 0) {
        onShowToast('No se encontraron hojas ni archivos Excel en Drive. Puedes crear uno nuevo.', 'info');
      } else {
        onShowToast(`Se encontraron ${files.length} hojas/archivos en Drive`, 'success');
      }
    } catch (err: any) {
      console.error('Error fetching drive spreadsheets:', err);
      onShowToast(`Error al buscar en Drive: ${err.message}`, 'error');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Google Sign-In with popup
  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        onUserChange(result.user);
        onShowToast(`Sesión iniciada como ${result.user.displayName || result.user.email}`, 'success');
        // Auto-search for Presupuesto file after successful login
        handleSearchPresupuesto(true);
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      if (err?.code === 'auth/unauthorized-domain' || err?.isUnauthorizedDomain) {
        setShowUnauthorizedModal(true);
      } else {
        onShowToast(`Error de autenticación: ${err.message || 'No se pudo iniciar sesión'}`, 'error');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  // Google Sign-Out
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

  // Select an existing spreadsheet by ID or URL
  const handleSelectSpreadsheet = async (sheetId: string) => {
    const cleanId = extractSpreadsheetId(sheetId);
    if (!cleanId) {
      onShowToast('ID o enlace inválido', 'error');
      return;
    }

    const existingFile = driveFiles.find((f) => f.id === cleanId);
    if (existingFile) {
      await handleLinkDriveFile(existingFile);
      setCustomSheetInput('');
      return;
    }

    let token = await getAccessToken();
    if (!token) {
      try {
        const authRes = await googleSignIn();
        if (authRes) token = authRes.accessToken;
      } catch (e) {}
    }

    if (!token) {
      onShowToast('Inicia sesión con Google para vincular la hoja', 'info');
      return;
    }

    setIsActionPending(true);
    setActionLabel('Conectando con la hoja...');
    try {
      let title = 'Hoja de Cálculo';
      let targetTab = 'Movimientos';
      let mimeType = 'application/vnd.google-apps.spreadsheet';
      let webViewLink = `https://docs.google.com/spreadsheets/d/${cleanId}/edit`;

      try {
        const details = await getSpreadsheetDetails(token, cleanId);
        title = details.title;
        targetTab = details.sheets.find((s) => s.title.toLowerCase() === 'movimientos')?.title || details.sheets[0]?.title || 'Movimientos';
        webViewLink = details.webViewLink || webViewLink;
      } catch (e) {
        // May be an Excel file in Drive
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        webViewLink = `https://drive.google.com/file/d/${cleanId}/view`;
      }

      onUpdateSettings({
        ...settings,
        googleSheetId: cleanId,
        googleSpreadsheetTitle: title,
        googleSheetName: targetTab,
        googleDriveWebViewLink: webViewLink,
        fileMimeType: mimeType,
        autoSync: true,
      });

      // Auto-import
      const pulled = await readAnySpreadsheet(token, cleanId, mimeType, targetTab);
      if (pulled.length > 0) {
        onImportMovements(pulled);
        onShowToast(`Vinculado a "${title}". Se importaron ${pulled.length} movimientos.`, 'success');
      } else {
        onShowToast(`Vinculado a "${title}" en Google Drive`, 'success');
      }
      setCustomSheetInput('');
    } catch (err: any) {
      console.error('Error selecting sheet:', err);
      onShowToast(`Error al conectar con la hoja: ${err.message}`, 'error');
    } finally {
      setIsActionPending(false);
      setActionLabel('');
    }
  };

  // Create a brand new Google Spreadsheet in Google Drive
  const handleCreateNewSheet = async () => {
    let token = await getAccessToken();
    if (!token) {
      try {
        const authRes = await googleSignIn();
        if (authRes) token = authRes.accessToken;
      } catch (e) {}
    }

    if (!token) {
      onShowToast('Inicia sesión con Google para crear la hoja en Drive', 'info');
      return;
    }

    setIsActionPending(true);
    setActionLabel('Creando hoja en Drive...');
    try {
      const created = await createDefaultSpreadsheet(token, 'Presupuesto_Mensual_50_30_20');
      onUpdateSettings({
        ...settings,
        googleSheetId: created.id,
        googleSpreadsheetTitle: created.title,
        googleSheetName: 'Movimientos',
        googleDriveWebViewLink: created.webViewLink,
        fileMimeType: 'application/vnd.google-apps.spreadsheet',
        autoSync: true,
      });

      onShowToast('¡Hoja "Presupuesto_Mensual_50_30_20" creada con éxito en Google Drive!', 'success');
      if (movimientos.length > 0) {
        await writeAnySpreadsheet(token, created.id, movimientos, 'application/vnd.google-apps.spreadsheet', 'Movimientos');
      }
      handleFetchDriveFiles();
    } catch (err: any) {
      console.error('Error creating spreadsheet:', err);
      onShowToast(`Error al crear la hoja: ${err.message}`, 'error');
    } finally {
      setIsActionPending(false);
      setActionLabel('');
    }
  };

  // 1. PULL / IMPORT: Read from Drive (Excel or Google Sheets), save to app & Firestore
  const handlePullFromSheet = async () => {
    if (!settings.googleSheetId) {
      onShowToast('Primero vincula un archivo o hoja de Google Drive', 'info');
      return;
    }

    let token = await getAccessToken();
    if (!token) {
      try {
        const authRes = await googleSignIn();
        if (authRes) token = authRes.accessToken;
      } catch (e) {}
    }

    if (!token) {
      onShowToast('Por favor vuelve a iniciar sesión con Google para sincronizar', 'info');
      return;
    }

    setIsActionPending(true);
    setActionLabel('Leyendo datos desde Drive...');
    try {
      const pulled = await readAnySpreadsheet(
        token,
        settings.googleSheetId,
        settings.fileMimeType || settings.googleSpreadsheetTitle,
        settings.googleSheetName || 'Movimientos'
      );

      if (pulled.length === 0) {
        onShowToast('El archivo en Google Drive no tiene movimientos registrados todavía.', 'info');
      } else {
        onImportMovements(pulled);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        onUpdateSettings({
          ...settings,
          lastSyncedAt: timeStr,
        });
        onShowToast(`¡Éxito! Se importaron ${pulled.length} movimientos desde Drive a la app y la base de datos`, 'success');
      }
    } catch (err: any) {
      console.error('Error pulling from Google Sheets:', err);
      onShowToast(`Error al leer desde Drive: ${err.message}`, 'error');
    } finally {
      setIsActionPending(false);
      setActionLabel('');
    }
  };

  // 2. PUSH / EXPORT: Write local and database movements to Drive (Excel or Google Sheets)
  const handlePushAllToSheet = () => {
    if (!settings.googleSheetId) {
      onShowToast('Primero vincula una hoja de cálculo o archivo Excel', 'info');
      return;
    }

    setConfirmationModal({
      isOpen: true,
      title: '¿Enviar datos a Google Drive / Excel?',
      description: `Se enviarán los ${movimientos.length} movimientos de la app y base de datos a "${settings.googleSpreadsheetTitle || 'Google Sheets'}". La hoja se actualizará para reflejar exactamente estos datos.`,
      onConfirm: async () => {
        setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
        let token = await getAccessToken();
        if (!token) {
          try {
            const authRes = await googleSignIn();
            if (authRes) token = authRes.accessToken;
          } catch (e) {}
        }

        if (!token) {
          onShowToast('Inicia sesión con Google para completar la sincronización', 'info');
          return;
        }

        setIsActionPending(true);
        setActionLabel('Enviando datos a Drive...');
        try {
          const res = await writeAnySpreadsheet(
            token,
            settings.googleSheetId!,
            movimientos,
            settings.fileMimeType || settings.googleSpreadsheetTitle,
            settings.googleSheetName || 'Movimientos'
          );
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          onUpdateSettings({
            ...settings,
            lastSyncedAt: timeStr,
          });
          onShowToast(`¡${res.count} movimientos guardados con éxito en tu archivo de Google Drive (${res.mode === 'excel' ? 'Excel' : 'Google Sheets'})!`, 'success');
        } catch (err: any) {
          console.error('Error syncing all:', err);
          onShowToast(`Error al sincronizar con Drive: ${err.message}`, 'error');
        } finally {
          setIsActionPending(false);
          setActionLabel('');
        }
      },
    });
  };

  // 3. FULL BIDIRECTIONAL SYNC: Merge Drive/Excel data with Firestore/App data
  const handleBidirectionalSync = async () => {
    if (!settings.googleSheetId) {
      onShowToast('Primero vincula una hoja o archivo Excel en Google Drive', 'info');
      return;
    }

    let token = await getAccessToken();
    if (!token) {
      try {
        const authRes = await googleSignIn();
        if (authRes) token = authRes.accessToken;
      } catch (e) {}
    }

    if (!token) {
      onShowToast('Inicia sesión con Google para sincronizar', 'info');
      return;
    }

    setIsActionPending(true);
    setActionLabel('Sincronizando bidireccionalmente...');
    try {
      // 1. Read from Drive
      const remoteMovs = await readAnySpreadsheet(
        token,
        settings.googleSheetId,
        settings.fileMimeType || settings.googleSpreadsheetTitle,
        settings.googleSheetName || 'Movimientos'
      );

      // 2. Merge without duplicates
      const { merged, added } = mergeMovements(movimientos, remoteMovs);

      // 3. Write unified set to Drive
      await writeAnySpreadsheet(
        token,
        settings.googleSheetId,
        merged,
        settings.fileMimeType || settings.googleSpreadsheetTitle,
        settings.googleSheetName || 'Movimientos'
      );

      // 4. Update local app and Firestore database
      onImportMovements(merged);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      onUpdateSettings({
        ...settings,
        lastSyncedAt: timeStr,
      });

      onShowToast(
        `¡Sincronización total bidireccional lista! ${merged.length} movimientos unificados (${added} nuevos incorporados)`,
        'success'
      );
    } catch (err: any) {
      console.error('Error in bidirectional sync:', err);
      onShowToast(`Error en sincronización bidireccional: ${err.message}`, 'error');
    } finally {
      setIsActionPending(false);
      setActionLabel('');
    }
  };

  // Convert an Excel file in Drive to a native Google Spreadsheet
  const handleConvertExcelToGoogleSheet = async () => {
    if (!settings.googleSheetId) return;

    let token = await getAccessToken();
    if (!token) {
      onShowToast('Inicia sesión con Google para convertir el archivo', 'info');
      return;
    }

    setIsActionPending(true);
    setActionLabel('Convirtiendo Excel a Google Sheets...');
    try {
      const converted = await convertDriveExcelToGoogleSpreadsheet(
        token,
        settings.googleSheetId,
        settings.googleSpreadsheetTitle || 'Presupuesto_Mensual_50_30_20'
      );

      onUpdateSettings({
        ...settings,
        googleSheetId: converted.id,
        googleSpreadsheetTitle: converted.title,
        googleSheetName: 'Movimientos',
        googleDriveWebViewLink: converted.webViewLink,
        fileMimeType: 'application/vnd.google-apps.spreadsheet',
      });

      onShowToast(`¡Archivo convertido a Google Sheets interactivo! Puedes editarlo en vivo en Docs.`, 'success');
      handleFetchDriveFiles();
    } catch (err: any) {
      console.error('Error converting excel:', err);
      onShowToast(`Error al convertir: ${err.message}`, 'error');
    } finally {
      setIsActionPending(false);
      setActionLabel('');
    }
  };

  // Local Excel file upload
  const handleLocalExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsActionPending(true);
    setActionLabel('Leyendo archivo Excel local...');
    try {
      const parsed = await parseLocalExcelFile(file);
      if (parsed.length === 0) {
        onShowToast('No se detectaron movimientos válidos en el archivo Excel seleccionado', 'info');
      } else {
        const { merged, added } = mergeMovements(movimientos, parsed);
        onImportMovements(merged);
        onShowToast(`¡Cargados ${parsed.length} movimientos desde ${file.name} (${added} nuevos añadidos a la base de datos)!`, 'success');
      }
    } catch (err: any) {
      console.error('Error reading local excel:', err);
      onShowToast(`Error al leer archivo Excel: ${err.message}`, 'error');
    } finally {
      setIsActionPending(false);
      setActionLabel('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isCurrentFileExcel = isExcelFile(settings.fileMimeType || settings.googleSpreadsheetTitle || '');

  return (
    <div className="bg-white border border-[#DCE3DC] rounded-2xl p-5 md:p-6 shadow-xs space-y-6">
      {/* Header with Google Connection Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#DCE3DC]">
        <div>
          <h2 className="font-display text-base md:text-lg font-bold text-[#16241E] flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#3E7C6B]" />
            <span>Sincronización Bidireccional: Drive, Excel y Base de Datos</span>
          </h2>
          <p className="text-xs text-[#6B776F] mt-1">
            Conecta tu Google Drive para enviar datos a tu Excel/Google Sheet y traerlos de vuelta a la app y la base de datos Firestore.
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
                  {isSigningIn ? 'Conectando...' : 'Conectar con Google Drive'}
                </span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Target Excel File Locator: Presupuesto_Mensual_50_30_20.xlsx */}
      <div className="border border-[#3E7C6B]/40 bg-[#F4F7F4] rounded-2xl p-4 md:p-5 space-y-3.5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#3E7C6B]/15 text-[#233830]">
                <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
                <span>Archivo Solicitado</span>
              </span>
              <span className="text-xs font-mono font-bold text-[#16241E] bg-white px-2 py-0.5 rounded border border-[#DCE3DC]">
                Presupuesto_Mensual_50_30_20.xlsx
              </span>
            </div>
            <p className="text-xs text-[#4D5751] leading-relaxed">
              Enlaza este archivo de Excel en Google Drive para enviar tus movimientos hacia el Excel y recibirlos de vuelta en la app y base de datos.
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
          <div className="bg-white/95 border border-emerald-300 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-950 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>¡Archivo enlazado y listo para sincronizar!</strong> Vinculado a{' '}
                <code className="bg-emerald-50 px-1 py-0.5 rounded text-emerald-800 font-bold font-mono">
                  {settings.googleSpreadsheetTitle}
                </code>{' '}
                ({isCurrentFileExcel ? 'Formato Excel .xlsx' : 'Google Sheets'}).
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
                  <span>Encontrado en Google Drive:</span>
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
              <span>Enlazar este archivo</span>
            </button>
          </div>
        ) : hasSearchedPresupuesto ? (
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">
                No encontramos el archivo "Presupuesto_Mensual_50_30_20.xlsx" en la búsqueda rápida.
              </p>
              <p className="text-[11px] text-amber-800/90 leading-relaxed">
                Puedes crearlo en 1 clic abajo pulsando <b>"Crear hoja en Google Drive"</b>, o si ya lo tienes en tu computadora, puedes subirlo a <a href="https://drive.google.com" target="_blank" rel="noopener noreferrer" className="underline font-bold">drive.google.com</a> o importarlo directamente usando las herramientas locales más abajo.
              </p>
            </div>
          </div>
        ) : !user ? (
          <div className="bg-white/70 border border-[#DCE3DC] rounded-xl p-3 text-xs text-[#6B776F]">
            Inicia sesión con tu cuenta de Google arriba para conectar con Drive y localizar tu archivo.
          </div>
        ) : null}
      </div>

      {/* Main Bidirectional Sync Operations Card */}
      {settings.googleSheetId && (
        <div className="border border-emerald-300 bg-emerald-50/40 rounded-2xl p-4 md:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs md:text-sm font-bold text-emerald-950 flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-[#3E7C6B]" />
                <span>Centro de Sincronización Bidireccional</span>
              </h3>
              <p className="text-xs text-emerald-800/80 mt-0.5">
                Manda datos al archivo de Drive / Excel y devuélvelos a la app y la base de datos Firestore en cualquier momento.
              </p>
            </div>

            {settings.lastSyncedAt && (
              <span className="text-[11px] bg-white text-emerald-900 font-semibold px-2.5 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
                Última sync: {settings.lastSyncedAt}
              </span>
            )}
          </div>

          {/* Sync Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Action 1: Full Bidirectional Sync */}
            <button
              type="button"
              onClick={handleBidirectionalSync}
              disabled={isActionPending}
              className="flex flex-col items-center justify-center text-center p-3.5 rounded-xl bg-[#16241E] hover:bg-[#233830] text-white shadow-xs transition-colors disabled:opacity-50 space-y-1.5"
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <ArrowUpDown className={`w-4 h-4 text-[#C9A227] ${isActionPending ? 'animate-spin' : ''}`} />
                <span>Sincronización Total</span>
              </div>
              <p className="text-[10px] text-white/70">
                Combina Excel + Base de Datos sin perder ningún registro
              </p>
            </button>

            {/* Action 2: Push / Send to Excel & Drive */}
            <button
              type="button"
              onClick={handlePushAllToSheet}
              disabled={isActionPending}
              className="flex flex-col items-center justify-center text-center p-3.5 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-950 shadow-2xs transition-colors disabled:opacity-50 space-y-1.5"
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Upload className="w-4 h-4 text-[#3E7C6B]" />
                <span>Enviar datos a Excel / Drive</span>
              </div>
              <p className="text-[10px] text-emerald-800/70">
                Guarda los {movimientos.length} movimientos de la app en la hoja
              </p>
            </button>

            {/* Action 3: Pull / Return from Excel & Drive */}
            <button
              type="button"
              onClick={handlePullFromSheet}
              disabled={isActionPending}
              className="flex flex-col items-center justify-center text-center p-3.5 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-950 shadow-2xs transition-colors disabled:opacity-50 space-y-1.5"
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Download className="w-4 h-4 text-[#3E7C6B]" />
                <span>Traer datos a la app y BD</span>
              </div>
              <p className="text-[10px] text-emerald-800/70">
                Lee la hoja y actualiza la app y base de datos Firestore
              </p>
            </button>
          </div>

          {/* Excel conversion banner if applicable */}
          {isCurrentFileExcel && (
            <div className="bg-white/80 border border-emerald-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5 text-emerald-900">
                <p className="font-bold flex items-center gap-1.5">
                  <FileCode2 className="w-4 h-4 text-[#3E7C6B]" />
                  <span>Tu archivo está en formato nativo Excel (.xlsx)</span>
                </p>
                <p className="text-[11px] text-emerald-800/80">
                  La app puede leer y escribir directamente en el archivo .xlsx. Si deseas abrirlo y editarlo online en Google Docs, puedes convertirlo a Google Sheets.
                </p>
              </div>
              <button
                type="button"
                onClick={handleConvertExcelToGoogleSheet}
                disabled={isActionPending}
                className="shrink-0 text-xs font-semibold px-3 py-1.5 bg-[#3E7C6B] hover:bg-[#2F5F52] text-white rounded-lg transition-colors shadow-2xs"
              >
                Convertir a Google Sheets
              </button>
            </div>
          )}
        </div>
      )}

      {/* Creation & Exploration Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Option 1: Create New Sheet in Drive */}
        <div className="border border-[#DCE3DC] rounded-xl p-4 bg-[#FAFBF9] flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-[#16241E] flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-[#3E7C6B]" />
              <span>Crear hoja automática en Google Drive</span>
            </h3>
            <p className="text-[11px] text-[#6B776F] leading-relaxed">
              Crea en tu Google Drive el archivo <b>"Presupuesto_Mensual_50_30_20"</b> con formato de columnas (Fecha, Mes, Tipo, Concepto, Regla 50/30/20, Monto, Notas) y pestañas de meses.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCreateNewSheet}
            disabled={!user || isActionPending}
            className="w-full bg-[#16241E] hover:bg-[#233830] text-white text-xs font-semibold py-2 px-3 rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
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
              <span>Explorar archivos de Drive</span>
            </h3>
            <p className="text-[11px] text-[#6B776F] leading-relaxed">
              Busca tus hojas de cálculo existentes o archivos Excel cargados en tu cuenta de Google Drive para seleccionarlos.
            </p>
          </div>
          <button
            type="button"
            onClick={handleFetchDriveFiles}
            disabled={!user || isLoadingFiles}
            className="w-full border border-[#DCE3DC] bg-white hover:bg-[#EEF2EE] text-[#16241E] text-xs font-semibold py-2 px-3 rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
            <span>{isLoadingFiles ? 'Buscando en Drive...' : 'Ver archivos de Drive'}</span>
          </button>
        </div>
      </div>

      {/* List of Drive Spreadsheets found */}
      {driveFiles.length > 0 && (
        <div className="border border-[#DCE3DC] rounded-xl p-3.5 bg-white space-y-2">
          <h4 className="text-xs font-bold text-[#16241E] flex items-center justify-between">
            <span>Archivos encontrados en tu Google Drive ({driveFiles.length}):</span>
            <span className="text-[10px] text-[#6B776F] font-normal">Haz clic en "Vincular" para conectar</span>
          </h4>
          <div className="max-h-48 overflow-y-auto divide-y divide-[#EEF2EE] border border-[#EEF2EE] rounded-lg">
            {driveFiles.map((file) => {
              const isTargetFile = file.name.toLowerCase().includes('presupuesto_mensual_50_30_20');
              const isActive = settings.googleSheetId === file.id;
              const isExcel = isExcelFile(file);

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
                        <span className="text-[10px] bg-[#EEF2EE] text-[#4D5751] px-1.5 py-0.2 rounded">
                          {isExcel ? 'Excel .xlsx' : 'Google Sheets'}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#6B776F]">
                        {file.modifiedTime ? `Modificado: ${new Date(file.modifiedTime).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Activo</span>
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

      {/* Manual Link Input */}
      <div className="pt-1">
        <label className="block text-xs font-semibold text-[#16241E] mb-1">
          O escribe/pega el enlace o ID directo del archivo de Drive o Google Sheets
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customSheetInput}
            onChange={(e) => setCustomSheetInput(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5n... o https://drive.google.com/file/d/..."
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

      {/* Local Excel (.xlsx) direct tools */}
      <div className="border-t border-[#DCE3DC] pt-4">
        <h4 className="text-xs font-bold text-[#16241E] mb-2 flex items-center gap-1.5">
          <Database className="w-4 h-4 text-[#3E7C6B]" />
          <span>Herramientas de Archivo Excel (.xlsx) Local</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isActionPending}
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-[#DCE3DC] bg-[#FAFBF9] hover:bg-[#EEF2EE] text-[#16241E] text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4 text-[#3E7C6B]" />
            <span>Cargar archivo .xlsx desde mi computadora</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleLocalExcelUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => {
              downloadMovementsAsExcel(movimientos, 'Presupuesto_Mensual_50_30_20.xlsx');
              onShowToast('Descargando archivo Presupuesto_Mensual_50_30_20.xlsx...', 'success');
            }}
            disabled={movimientos.length === 0}
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-[#DCE3DC] bg-[#FAFBF9] hover:bg-[#EEF2EE] text-[#16241E] text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-[#C9A227]" />
            <span>Descargar copia en Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Auto-Sync Toggle */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFBF9] border border-[#DCE3DC]">
        <div>
          <p className="text-xs font-bold text-[#16241E]">Sincronización en tiempo real automática</p>
          <p className="text-[11px] text-[#6B776F]">
            Al agregar o editar un movimiento en la app, se registrará de inmediato en tu archivo de Google Drive.
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

      {/* Loading Overlay */}
      {isActionPending && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 shadow-xl border border-[#DCE3DC] flex items-center gap-3 max-w-sm w-full animate-in fade-in zoom-in-95">
            <RefreshCw className="w-5 h-5 text-[#3E7C6B] animate-spin shrink-0" />
            <div>
              <p className="text-xs font-bold text-[#16241E]">{actionLabel || 'Sincronizando con Google Drive...'}</p>
              <p className="text-[11px] text-[#6B776F]">Por favor espera un momento</p>
            </div>
          </div>
        </div>
      )}

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
                Confirmar y Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ayuda para Dominio no Autorizado en Firebase */}
      <UnauthorizedDomainModal
        isOpen={showUnauthorizedModal}
        onClose={() => setShowUnauthorizedModal(false)}
        onRetry={handleSignIn}
      />
    </div>
  );
};
