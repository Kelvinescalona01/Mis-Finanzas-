import React, { useState, useEffect } from 'react';
import { X, Check, Sparkles } from 'lucide-react';
import { Movimiento, TipoMovimiento, CategoriaRegla, AppSettings } from '../types';
import { TIPOS_MOVIMIENTO, SUGERENCIAS_POR_TIPO, MESES } from '../data/initialData';

interface AddMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (movement: Omit<Movimiento, 'id'>, editId?: string) => void;
  initialData?: Movimiento | null;
  defaultMonth: string;
  settings: AppSettings;
}

export const AddMovementModal: React.FC<AddMovementModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultMonth,
  settings,
}) => {
  const [tipo, setTipo] = useState<TipoMovimiento>('GastoVariable');
  const [concepto, setConcepto] = useState('');
  const [necesidad, setNecesidad] = useState<CategoriaRegla>('Necesidades');
  const [monto, setMonto] = useState<string>('');
  const [fecha, setFecha] = useState<string>(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTipo(initialData.tipo);
      setConcepto(initialData.concepto);
      setNecesidad(initialData.necesidad);
      setMonto(String(initialData.monto));
      setFecha(initialData.fecha);
      setNotas(initialData.notas || '');
    } else {
      setTipo('GastoVariable');
      setConcepto('');
      setNecesidad('Necesidades');
      setMonto('');
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      setFecha(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      setNotas('');
    }
    setError(null);
  }, [initialData, isOpen]);

  // Adjust default 50/30/20 category when tipo changes
  const handleSelectTipo = (t: TipoMovimiento) => {
    setTipo(t);
    if (t === 'Factura' || t === 'Deuda') {
      setNecesidad('Necesidades');
    } else if (t === 'Ahorro' || t === 'Inversion') {
      setNecesidad('Ahorros');
    } else if (t === 'Ingreso') {
      setNecesidad('Necesidades');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedMonto = parseFloat(monto);
    if (!concepto.trim()) {
      setError('Por favor escribe un concepto o descripción.');
      return;
    }
    if (isNaN(parsedMonto) || parsedMonto <= 0) {
      setError('Ingresa un monto válido mayor a 0.');
      return;
    }

    // Determine month based on selected date
    let derivedMonth = defaultMonth;
    if (fecha) {
      const parts = fecha.split('-');
      if (parts.length >= 2) {
        const monthNum = parseInt(parts[1], 10);
        if (monthNum >= 1 && monthNum <= 12) {
          derivedMonth = MESES[monthNum - 1];
        }
      }
    }

    onSave(
      {
        tipo,
        concepto: concepto.trim(),
        necesidad: tipo === 'Ingreso' ? '' : necesidad,
        monto: parsedMonto,
        fecha,
        mes: derivedMonth,
        notas: notas.trim() || undefined,
      },
      initialData ? initialData.id : undefined
    );

    onClose();
  };

  const currentSuggestions = SUGERENCIAS_POR_TIPO[tipo] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-[#DCE3DC] overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#DCE3DC] flex items-center justify-between bg-[#FAFBF9]">
          <div>
            <h2 className="font-display text-lg font-bold text-[#16241E]">
              {initialData ? 'Editar Movimiento' : 'Nuevo Movimiento'}
            </h2>
            <p className="text-xs text-[#6B776F]">
              Registra entradas, gastos, facturas o aportes de ahorro
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6B776F] hover:bg-[#EEF2EE] transition-colors"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Tipo Selector Grid */}
          <div>
            <label className="block text-xs font-semibold text-[#16241E] mb-2">
              Tipo de Operación
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TIPOS_MOVIMIENTO.map((t) => {
                const isSelected = tipo === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => handleSelectTipo(t.value)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-medium text-center transition-all ${
                      isSelected
                        ? 'bg-[#16241E] text-white border-[#16241E] shadow-xs'
                        : 'bg-white border-[#DCE3DC] text-[#16241E] hover:bg-[#FAFBF9]'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Concepto & Smart Suggestions */}
          <div>
            <label htmlFor="concepto-input" className="block text-xs font-semibold text-[#16241E] mb-1.5">
              Concepto / Título
            </label>
            <input
              id="concepto-input"
              type="text"
              required
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej. Renta, Supermercado, Sueldo quincenal..."
              className="w-full bg-white border border-[#DCE3DC] rounded-xl px-3.5 py-2.5 text-sm text-[#16241E] focus:outline-none focus:ring-2 focus:ring-[#3E7C6B]"
            />

            {/* Suggestions Chips */}
            {currentSuggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="text-[11px] text-[#6B776F] inline-flex items-center gap-1 py-0.5">
                  <Sparkles className="w-3 h-3 text-[#C9A227]" /> Sugerencias:
                </span>
                {currentSuggestions.slice(0, 4).map((s) => (
                  <button
                    key={s.concepto}
                    type="button"
                    onClick={() => {
                      setConcepto(s.concepto);
                      if (s.necesidad) setNecesidad(s.necesidad);
                    }}
                    className="text-[11px] bg-[#EEF2EE] hover:bg-[#DCE3DC] text-[#16241E] px-2 py-0.5 rounded-lg transition-colors"
                  >
                    {s.concepto}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Monto Field & Quick Presets */}
          <div>
            <label htmlFor="monto-input" className="block text-xs font-semibold text-[#16241E] mb-1.5">
              Monto ({settings.simboloMoneda})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-[#6B776F] font-bold">
                {settings.simboloMoneda}
              </span>
              <input
                id="monto-input"
                type="number"
                step="0.01"
                min="0"
                required
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-[#DCE3DC] rounded-xl text-base font-semibold text-[#16241E] focus:outline-none focus:ring-2 focus:ring-[#3E7C6B]"
              />
            </div>
            <div className="flex gap-1.5 mt-2">
              {[100, 500, 1000, 5000].map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => {
                    const current = parseFloat(monto) || 0;
                    setMonto(String(current + quick));
                  }}
                  className="text-xs bg-[#FAFBF9] border border-[#DCE3DC] hover:bg-[#EEF2EE] text-[#6B776F] hover:text-[#16241E] px-2.5 py-1 rounded-lg transition-colors font-medium"
                >
                  +{quick}
                </button>
              ))}
            </div>
          </div>

          {/* Regla 50/30/20 classification (only for non-income) */}
          {tipo !== 'Ingreso' && (
            <div>
              <label className="block text-xs font-semibold text-[#16241E] mb-1.5">
                Clasificación Regla 50 / 30 / 20
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'Necesidades', label: '50% Necesidad', desc: 'Básico para vivir' },
                  { value: 'Deseos', label: '30% Deseo', desc: 'Ocio y gustos' },
                  { value: 'Ahorros', label: '20% Ahorro', desc: 'Futuro e inversión' },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setNecesidad(item.value as CategoriaRegla)}
                    className={`p-2 rounded-xl border text-left transition-all ${
                      necesidad === item.value
                        ? 'bg-[#FAFBF9] border-[#3E7C6B] ring-1 ring-[#3E7C6B]'
                        : 'bg-white border-[#DCE3DC] hover:bg-[#FAFBF9]'
                    }`}
                  >
                    <div className="text-xs font-bold text-[#16241E]">{item.label}</div>
                    <div className="text-[10px] text-[#6B776F]">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fecha & Notas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="fecha-input" className="block text-xs font-semibold text-[#16241E] mb-1.5">
                Fecha
              </label>
              <input
                id="fecha-input"
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-white border border-[#DCE3DC] rounded-xl px-3 py-2 text-xs text-[#16241E] focus:outline-none focus:ring-2 focus:ring-[#3E7C6B]"
              />
            </div>
            <div>
              <label htmlFor="notas-input" className="block text-xs font-semibold text-[#16241E] mb-1.5">
                Notas (Opcional)
              </label>
              <input
                id="notas-input"
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej. Pagado con TDC, factura #4"
                className="w-full bg-white border border-[#DCE3DC] rounded-xl px-3 py-2 text-xs text-[#16241E] focus:outline-none focus:ring-2 focus:ring-[#3E7C6B]"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-[#DCE3DC] hover:bg-[#EEF2EE] text-[#16241E] font-semibold text-sm rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-[#16241E] hover:bg-[#233830] text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4 text-[#C9A227]" />
              <span>{initialData ? 'Actualizar' : 'Guardar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
