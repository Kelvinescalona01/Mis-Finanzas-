import React, { useState } from 'react';
import { ShieldAlert, ExternalLink, Copy, Check, AlertCircle, X, ArrowRight } from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

interface UnauthorizedDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry?: () => void;
}

export const UnauthorizedDomainModal: React.FC<UnauthorizedDomainModalProps> = ({
  isOpen,
  onClose,
  onRetry,
}) => {
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const firebaseSettingsUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`;

  const knownDomains = [
    { label: 'Tu despliegue en Vercel', domain: 'mis-finanzas-vert-sigma.vercel.app', isHighlighted: true },
    ...(currentHost && currentHost !== 'mis-finanzas-vert-sigma.vercel.app'
      ? [{ label: 'Dominio actual detectado', domain: currentHost, isHighlighted: false }]
      : []),
    { label: 'Entorno de Desarrollo AI Studio', domain: 'ais-dev-7d6pazivlz32bk7s7kar3e-452075417036.us-west1.run.app', isHighlighted: false },
    { label: 'Vista previa Compartida AI Studio', domain: 'ais-pre-7d6pazivlz32bk7s7kar3e-452075417036.us-west1.run.app', isHighlighted: false },
  ];

  if (!isOpen) return null;

  const handleCopy = async (domain: string) => {
    try {
      await navigator.clipboard.writeText(domain);
      setCopiedDomain(domain);
      setTimeout(() => setCopiedDomain(null), 2500);
    } catch {
      setCopiedDomain(domain);
      setTimeout(() => setCopiedDomain(null), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-[#DCE3DC] shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#FAFBF9] border-b border-[#DCE3DC] px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-700">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm md:text-base text-[#16241E]">
                Autorizar dominio en Firebase
              </h3>
              <p className="text-[11px] text-[#6B776F] font-mono">
                Error auth/unauthorized-domain
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#6B776F] hover:text-[#16241E] p-1.5 rounded-lg hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs text-[#16241E] overflow-y-auto">
          <p className="text-[#3A453F] leading-relaxed">
            Para que el inicio de sesión con Google funcione en <strong>Vercel</strong> y en cualquier entorno, debes agregar el dominio a la lista de <strong>Dominios autorizados</strong> de tu proyecto Firebase (<strong>{firebaseConfig.projectId}</strong>).
          </p>

          {/* Domain List Box */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-[#6B776F] uppercase tracking-wider block">
              Dominios a autorizar:
            </span>
            <div className="space-y-2">
              {knownDomains.map((item) => (
                <div
                  key={item.domain}
                  className={`border rounded-xl p-2.5 sm:p-3 flex items-center justify-between gap-2 ${
                    item.isHighlighted
                      ? 'bg-emerald-50/50 border-emerald-300/80'
                      : 'bg-[#EEF2EE]/50 border-[#DCE3DC]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold text-[#6B776F] mb-0.5">
                      {item.label}
                    </div>
                    <div className="font-mono text-xs font-bold text-[#1F5143] truncate select-all">
                      {item.domain}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy(item.domain)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 shadow-2xs border ${
                      copiedDomain === item.domain
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-white hover:bg-[#FAFBF9] text-[#16241E] border-[#DCE3DC]'
                    }`}
                  >
                    {copiedDomain === item.domain ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#6B776F]" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-2.5 pt-1">
            <h4 className="font-semibold text-xs text-[#16241E]">
              Pasos para autorizarlo (toma 30 segundos):
            </h4>
            <ol className="space-y-2 text-[#46544D]">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#1F5143] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  Copia el dominio <strong>mis-finanzas-vert-sigma.vercel.app</strong> usando el botón de arriba.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#1F5143] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  Haz clic en el botón <strong>&quot;Abrir Firebase Console&quot;</strong> abajo.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#1F5143] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  Baja a la sección <strong>&quot;Dominios autorizados&quot; (Authorized domains)</strong>, presiona <strong>&quot;Agregar dominio&quot;</strong>, pega el dominio y presiona <strong>Guardar</strong>.
                </span>
              </li>
            </ol>
          </div>
        </div>

        {/* Footer actions */}
        <div className="bg-[#FAFBF9] border-t border-[#DCE3DC] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <a
            href={firebaseSettingsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1F5143] hover:bg-[#184035] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
          >
            <span>Abrir Firebase Console</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-[#6B776F] hover:text-[#16241E] transition-colors"
            >
              Cerrar
            </button>
            {onRetry && (
              <button
                onClick={() => {
                  onClose();
                  onRetry();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#DCE3DC] hover:bg-[#EEF2EE] text-[#16241E] font-semibold text-xs rounded-xl transition-colors shadow-2xs"
              >
                <span>Reintentar</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#1F5143]" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
