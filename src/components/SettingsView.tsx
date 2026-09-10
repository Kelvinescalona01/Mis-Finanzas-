import React, { useState } from 'react';
import { Settings, RefreshCw, CheckCircle2, AlertCircle, FileText, Download, Upload, RotateCcw, ChevronDown, ChevronUp, Database, Cloud } from 'lucide-react';
import { User } from 'firebase/auth';
import { AppSettings, Movimiento, MetaAhorro } from '../types';
import { GoogleSheetsIntegration } from './GoogleSheetsIntegration';
import { UnauthorizedDomainModal } from './UnauthorizedDomainModal';
import firebaseConfig from '../../firebase-applet-config.json';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  movimientos: Movimiento[];
  metas: MetaAhorro[];
  onImportData: (data: { movimientos: Movimiento[]; metas: MetaAhorro[] }) => void;
  onImportMovements: (movements: Movimiento[]) => void;
  onResetSampleData: () => void;
  onClearAll: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  user: User | null;
  onUserChange: (user: User | null) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  movimientos,
  metas,
  onImportData,
  onImportMovements,
  onResetSampleData,
  onClearAll,
  onShowToast,
  user,
  onUserChange,
}) => {
  const [endpoint, setEndpoint] = useState(settings.sheetsEndpoint);
  const [moneda, setMoneda] = useState(settings.moneda);
  const [simbolo, setSimbolo] = useState(settings.simboloMoneda);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAdvancedAppsScript, setShowAdvancedAppsScript] = useState(false);
  const [showUnauthorizedModal, setShowUnauthorizedModal] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      sheetsEndpoint: endpoint.trim(),
      moneda,
      simboloMoneda: simbolo,
    });
    onShowToast('Ajustes guardados correctamente', 'success');
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const url = new URL(endpoint.trim() || '/api', window.location.origin);
      url.searchParams.set('action', 'resumen');
      url.searchParams.set('mes', 'Enero');
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTestResult({ ok: true, message: '¡Conexión exitosa con el servicio!' });
      onShowToast('Conexión verificada con éxito', 'success');
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: `Error de conexión: ${err.message || 'No se pudo conectar al endpoint'}`,
      });
      onShowToast('No se pudo conectar al endpoint', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSyncToEndpoint = async () => {
    if (!endpoint || endpoint === '/api') {
      onShowToast('Tus datos ya están guardados de forma segura en tu navegador.', 'info');
      return;
    }
    setIsSyncing(true);
    try {
      // Sync movements one by one or in batch
      let successCount = 0;
      for (const mov of movimientos) {
        const payload = {
          action: 'agregar',
          fecha: mov.fecha,
          mes: mov.mes,
          tipo: mov.tipo,
          concepto: mov.concepto,
          necesidad: mov.necesidad,
          monto: mov.monto,
        };
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        successCount++;
      }
      onShowToast(`Sincronizados ${successCount} movimientos con Google Sheets`, 'success');
    } catch (err: any) {
      onShowToast(`Error en la sincronización: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportBackup = () => {
    const data = {
      version: '2.0',
      exportDate: new Date().toISOString(),
      movimientos,
      metas,
      settings,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mis-finanzas-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    onShowToast('Copia de seguridad descargada', 'success');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (!Array.isArray(parsed.movimientos)) {
          throw new Error('Formato de respaldo inválido.');
        }
        onImportData({
          movimientos: parsed.movimientos,
          metas: Array.isArray(parsed.metas) ? parsed.metas : [],
        });
        onShowToast('Datos restaurados exitosamente', 'success');
      } catch (err: any) {
        onShowToast('Error al restaurar: archivo no válido', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-5 pb-8 max-w-4xl mx-auto">
      {/* Integración oficial Google Drive & Google Sheets en tiempo real */}
      <GoogleSheetsIntegration
        settings={settings}
        onUpdateSettings={onUpdateSettings}
        movimientos={movimientos}
        onImportMovements={onImportMovements}
        onShowToast={onShowToast}
        user={user}
        onUserChange={onUserChange}
      />

      {/* Opción adicional: Conexión mediante Apps Script (Code.gs) */}
      <div className="bg-white border border-[#DCE3DC] rounded-2xl p-5 md:p-6 shadow-xs space-y-3">
        <button
          type="button"
          onClick={() => setShowAdvancedAppsScript((prev) => !prev)}
          className="w-full flex items-center justify-between text-left focus:outline-none"
        >
          <div>
            <h2 className="font-display text-sm md:text-base font-bold text-[#16241E] flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#6B776F]" />
              <span>Opciones alternativas: Conexión mediante Apps Script (Code.gs)</span>
            </h2>
            <p className="text-xs text-[#6B776F] mt-0.5">
              Si prefieres usar una macro personalizada o webhook /exec publicado en Google Apps Script.
            </p>
          </div>
          <span className="text-[#6B776F] hover:text-[#16241E] p-1">
            {showAdvancedAppsScript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {showAdvancedAppsScript && (
          <form onSubmit={handleSaveSettings} className="space-y-3 pt-3 border-t border-[#EEF2EE]">
            <div>
              <label className="block text-xs font-semibold text-[#16241E] mb-1">
                URL de la Web App de Apps Script o /api local
              </label>
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec o /api"
                className="w-full bg-[#FAFBF9] border border-[#DCE3DC] rounded-xl px-3 py-2 text-xs text-[#16241E] focus:outline-none focus:ring-2 focus:ring-[#3E7C6B]"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                className="bg-[#16241E] hover:bg-[#233830] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                Guardar URL de Apps Script
              </button>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="border border-[#DCE3DC] hover:bg-[#EEF2EE] text-[#16241E] text-xs font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                {isTesting ? 'Probando...' : 'Probar Conexión'}
              </button>
              <button
                type="button"
                onClick={handleSyncToEndpoint}
                disabled={isSyncing}
                className="border border-[#3E7C6B] text-[#3E7C6B] hover:bg-[#3E7C6B]/10 text-xs font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                {isSyncing ? 'Sincronizando...' : 'Enviar a Apps Script'}
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  testResult.ok
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {testResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            {/* Instruction guide */}
            <div className="mt-3 p-3.5 rounded-xl bg-[#FAFBF9] border border-[#DCE3DC] text-xs text-[#6B776F] space-y-2">
              <div className="font-semibold text-[#16241E] flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#C9A227]" />
                <span>¿Cómo conectar tu Google Sheets con Code.gs?</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 pl-1 leading-relaxed">
                <li>Abre tu hoja en Google Sheets.</li>
                <li>Ve a <b>Extensiones &gt; Apps Script</b> y pega el código de <code>Code.gs</code>.</li>
                <li>Haz clic en <b>Implementar &gt; Nueva implementación &gt; Aplicación web</b>.</li>
                <li>En "Quién tiene acceso", selecciona <i>Cualquier usuario</i>.</li>
                <li>Copia la URL que termina en <code>/exec</code> y pégala arriba.</li>
              </ol>
            </div>
          </form>
        )}
      </div>

      {/* Base de Datos Firebase Firestore */}
      <div className="bg-white border border-[#DCE3DC] rounded-2xl p-5 md:p-6 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-[#16241E] flex items-center gap-2">
                <span>Firebase Firestore</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Conectado
                </span>
              </h2>
              <p className="text-xs text-[#6B776F]">
                Base de datos en la nube provisionada y sincronizada en tiempo real.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#FAFBF9] border border-[#DCE3DC] rounded-xl p-3.5 space-y-2 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-[#6B776F] font-medium">Proyecto Firebase:</span>
            <span className="font-mono text-[11px] text-[#16241E] font-semibold">{firebaseConfig.projectId}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-t border-[#DCE3DC]/50 pt-2">
            <span className="text-[#6B776F] font-medium">ID de Base de Datos:</span>
            <span className="font-mono text-[11px] text-[#3E7C6B] font-semibold truncate max-w-xs">{firebaseConfig.firestoreDatabaseId}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-t border-[#DCE3DC]/50 pt-2">
            <span className="text-[#6B776F] font-medium">Estado de Autenticación:</span>
            <span className="text-[#16241E] font-medium">
              {user ? (
                <span className="text-emerald-700 font-semibold">Sesión activa ({user.email})</span>
              ) : (
                <span className="text-amber-700">Inicia sesión con Google para sincronizar tus movimientos en la nube</span>
              )}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-[#DCE3DC]/50 pt-2.5">
            <div>
              <span className="text-[#16241E] font-semibold text-xs block">¿Error al iniciar sesión con Google (auth/unauthorized-domain)?</span>
              <span className="text-[#6B776F] text-[11px]">Agrega el dominio de tu app a la lista de dominios autorizados de Firebase.</span>
            </div>
            <button
              type="button"
              onClick={() => setShowUnauthorizedModal(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-[#DCE3DC] hover:bg-[#EEF2EE] text-[#1F5143] font-semibold text-xs rounded-lg shadow-2xs transition-colors shrink-0"
            >
              <span>Ver cómo autorizar dominio</span>
            </button>
          </div>
        </div>
      </div>

      {/* Moneda & Preferencias */}
      <div className="bg-white border border-[#DCE3DC] rounded-2xl p-5 md:p-6 shadow-xs space-y-3.5">
        <h2 className="font-display text-base md:text-lg font-bold text-[#16241E]">
          Moneda y Preferencias
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#16241E] mb-1">
              Código de Moneda
            </label>
            <select
              value={moneda}
              onChange={(e) => setMoneda(e.target.value)}
              className="w-full bg-[#FAFBF9] border border-[#DCE3DC] rounded-xl px-3 py-2 text-xs font-medium text-[#16241E]"
            >
              <option value="MXN">MXN (Pesos Mexicanos)</option>
              <option value="USD">USD (Dólares)</option>
              <option value="EUR">EUR (Euros)</option>
              <option value="COP">COP (Pesos Colombianos)</option>
              <option value="ARS">ARS (Pesos Argentinos)</option>
              <option value="CLP">CLP (Pesos Chilenos)</option>
              <option value="PEN">PEN (Soles Peruanos)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#16241E] mb-1">
              Símbolo
            </label>
            <input
              type="text"
              value={simbolo}
              onChange={(e) => setSimbolo(e.target.value)}
              className="w-full bg-[#FAFBF9] border border-[#DCE3DC] rounded-xl px-3 py-2 text-xs font-bold text-[#16241E]"
            />
          </div>
        </div>
      </div>

      {/* Respaldo y Gestión de Datos */}
      <div className="bg-white border border-[#DCE3DC] rounded-2xl p-5 md:p-6 shadow-xs space-y-3.5">
        <h2 className="font-display text-base md:text-lg font-bold text-[#16241E]">
          Copia de Seguridad y Datos
        </h2>
        <p className="text-xs text-[#6B776F]">
          Exporta tus movimientos en formato JSON para restaurarlos en cualquier momento o muévelos a otro dispositivo.
        </p>

        <div className="flex flex-wrap gap-2.5 pt-1">
          <button
            onClick={handleExportBackup}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-[#FAFBF9] border border-[#DCE3DC] hover:bg-[#EEF2EE] text-[#16241E] transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#3E7C6B]" />
            <span>Descargar Respaldo JSON</span>
          </button>

          <label className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-[#FAFBF9] border border-[#DCE3DC] hover:bg-[#EEF2EE] text-[#16241E] transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-[#C9A227]" />
            <span>Restaurar desde JSON</span>
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>

          <button
            onClick={onResetSampleData}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-[#FAFBF9] border border-[#DCE3DC] hover:bg-[#EEF2EE] text-[#6B776F] hover:text-[#16241E] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Poner Todo en Cero</span>
          </button>

          <button
            onClick={onClearAll}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors ml-auto"
          >
            <span>Borrar y Dejar en Cero</span>
          </button>
        </div>
      </div>

      {/* Modal para Guía de Autorización de Dominio en Firebase */}
      <UnauthorizedDomainModal
        isOpen={showUnauthorizedModal}
        onClose={() => setShowUnauthorizedModal(false)}
      />
    </div>
  );
};
