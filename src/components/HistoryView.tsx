import React, { useState, useMemo } from 'react';
import { Search, Download, Trash2, Edit3, Copy, Plus, Filter, ArrowUpDown } from 'lucide-react';
import { Movimiento, TipoMovimiento, CategoriaRegla, AppSettings } from '../types';
import { formatCurrency, downloadCSV } from '../utils/finance';
import { MESES, TIPOS_MOVIMIENTO } from '../data/initialData';

interface HistoryViewProps {
  movimientos: Movimiento[];
  selectedMonth: string;
  onSelectMonth: (m: string) => void;
  settings: AppSettings;
  onOpenAddModal: () => void;
  onEditMovement: (mov: Movimiento) => void;
  onDuplicateMovement: (mov: Movimiento) => void;
  onDeleteMovement: (id: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  movimientos,
  selectedMonth,
  onSelectMonth,
  settings,
  onOpenAddModal,
  onEditMovement,
  onDuplicateMovement,
  onDeleteMovement,
}) => {
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterRegla, setFilterRegla] = useState<string>('todos');
  const [filterMonthScope, setFilterMonthScope] = useState<'current' | 'all'>('current');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  const sym = settings.simboloMoneda;

  // Filter and sort movements
  const filteredMovements = useMemo(() => {
    return movimientos
      .filter((m) => {
        // Month filter
        if (filterMonthScope === 'current' && m.mes !== selectedMonth) {
          return false;
        }
        // Tipo filter
        if (filterTipo !== 'todos' && m.tipo !== filterTipo) {
          return false;
        }
        // Regla 50/30/20 filter
        if (filterRegla !== 'todos' && m.necesidad !== filterRegla) {
          return false;
        }
        // Search query
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchConcepto = m.concepto.toLowerCase().includes(q);
          const matchNotas = m.notas ? m.notas.toLowerCase().includes(q) : false;
          const matchTipo = m.tipo.toLowerCase().includes(q);
          if (!matchConcepto && !matchNotas && !matchTipo) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') return b.fecha.localeCompare(a.fecha);
        if (sortBy === 'date-asc') return a.fecha.localeCompare(b.fecha);
        if (sortBy === 'amount-desc') return b.monto - a.monto;
        if (sortBy === 'amount-asc') return a.monto - b.monto;
        return 0;
      });
  }, [movimientos, filterMonthScope, selectedMonth, filterTipo, filterRegla, search, sortBy]);

  // Aggregate stats of current filtered selection
  const totalFilteredAmount = filteredMovements.reduce((acc, m) => {
    return m.tipo === 'Ingreso' ? acc + m.monto : acc - m.monto;
  }, 0);

  const handleExportCSV = () => {
    const filename = `finanzas-${filterMonthScope === 'current' ? selectedMonth.toLowerCase() : 'anual'}.csv`;
    downloadCSV(filteredMovements, filename);
  };

  return (
    <div className="space-y-4 pb-8 max-w-4xl mx-auto">
      {/* Header Controls */}
      <div className="bg-white border border-[#DCE3DC] rounded-2xl p-4 md:p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-[#16241E]">
              Historial de Movimientos
            </h2>
            <p className="text-xs text-[#6B776F]">
              Consulta, filtra y exporta todas tus transacciones
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-[#DCE3DC] hover:bg-[#EEF2EE] text-[#16241E] transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#3E7C6B]" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#16241E] hover:bg-[#233830] text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-[#C9A227]" />
              <span>Nuevo</span>
            </button>
          </div>
        </div>

        {/* Search & Sort Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-[#6B776F] absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por concepto o notas..."
              className="w-full pl-9 pr-3 py-2 bg-[#FAFBF9] border border-[#DCE3DC] rounded-xl text-xs text-[#16241E] focus:outline-none focus:ring-2 focus:ring-[#3E7C6B]"
            />
          </div>

          <div className="relative">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#6B776F] absolute left-3 top-2.5" />
            <select
              aria-label="Ordenar movimientos"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full pl-8 pr-3 py-2 bg-[#FAFBF9] border border-[#DCE3DC] rounded-xl text-xs font-medium text-[#16241E] focus:outline-none focus:ring-2 focus:ring-[#3E7C6B]"
            >
              <option value="date-desc">Más recientes primero</option>
              <option value="date-asc">Más antiguos primero</option>
              <option value="amount-desc">Mayor monto primero</option>
              <option value="amount-asc">Menor monto primero</option>
            </select>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#DCE3DC]">
          <span className="text-[11px] font-semibold text-[#6B776F] inline-flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filtros:
          </span>

          {/* Month Scope Toggle */}
          <div className="inline-flex bg-[#FAFBF9] border border-[#DCE3DC] rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setFilterMonthScope('current')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                filterMonthScope === 'current'
                  ? 'bg-white shadow-xs text-[#16241E] font-semibold'
                  : 'text-[#6B776F]'
              }`}
            >
              Mes actual ({selectedMonth})
            </button>
            <button
              onClick={() => setFilterMonthScope('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                filterMonthScope === 'all'
                  ? 'bg-white shadow-xs text-[#16241E] font-semibold'
                  : 'text-[#6B776F]'
              }`}
            >
              Todos los meses
            </button>
          </div>

          {/* Tipo Dropdown */}
          <select
            aria-label="Filtrar por tipo"
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="bg-[#FAFBF9] border border-[#DCE3DC] rounded-lg px-2.5 py-1 text-xs text-[#16241E] font-medium focus:outline-none"
          >
            <option value="todos">Todos los Tipos</option>
            {TIPOS_MOVIMIENTO.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          {/* 50/30/20 Regla Dropdown */}
          <select
            aria-label="Filtrar por regla 50/30/20"
            value={filterRegla}
            onChange={(e) => setFilterRegla(e.target.value)}
            className="bg-[#FAFBF9] border border-[#DCE3DC] rounded-lg px-2.5 py-1 text-xs text-[#16241E] font-medium focus:outline-none"
          >
            <option value="todos">Toda la Regla</option>
            <option value="Necesidades">Necesidades (50%)</option>
            <option value="Deseos">Deseos (30%)</option>
            <option value="Ahorros">Ahorros (20%)</option>
          </select>
        </div>
      </div>

      {/* Results summary bar */}
      <div className="flex items-center justify-between px-1 text-xs text-[#6B776F]">
        <span>
          Mostrando <b className="text-[#16241E]">{filteredMovements.length}</b> registros
        </span>
        <span>
          Balance neto filtrado:{' '}
          <b
            className={`font-display font-semibold ${
              totalFilteredAmount >= 0 ? 'text-[#3E7C6B]' : 'text-[#A6483B]'
            }`}
          >
            {formatCurrency(totalFilteredAmount, sym)}
          </b>
        </span>
      </div>

      {/* Movements List */}
      <div className="bg-white border border-[#DCE3DC] rounded-2xl divide-y divide-[#DCE3DC] overflow-hidden shadow-xs">
        {filteredMovements.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-sm font-medium text-[#16241E]">No se encontraron movimientos</p>
            <p className="text-xs text-[#6B776F] mt-1">
              Prueba cambiando los filtros o agrega un nuevo movimiento.
            </p>
            <button
              onClick={onOpenAddModal}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#16241E] px-3.5 py-2 rounded-xl"
            >
              <Plus className="w-3.5 h-3.5 text-[#C9A227]" />
              <span>Crear movimiento</span>
            </button>
          </div>
        ) : (
          filteredMovements.map((mov) => {
            const isIncome = mov.tipo === 'Ingreso';
            const tipoConfig = TIPOS_MOVIMIENTO.find((t) => t.value === mov.tipo);

            return (
              <div
                key={mov.id}
                className="p-3.5 md:p-4 hover:bg-[#FAFBF9] transition-colors flex items-center justify-between gap-3 group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-[#16241E] truncate">
                      {mov.concepto}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                        tipoConfig ? tipoConfig.bg : 'bg-gray-100 text-gray-700'
                      } ${tipoConfig ? tipoConfig.color : ''}`}
                    >
                      {tipoConfig ? tipoConfig.label : mov.tipo}
                    </span>
                    {mov.necesidad && (
                      <span className="text-[10px] bg-[#EEF2EE] text-[#6B776F] px-1.5 py-0.5 rounded font-medium">
                        {mov.necesidad}
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-[#6B776F] mt-1 flex items-center gap-2">
                    <span>{mov.fecha}</span>
                    <span>&middot;</span>
                    <span>{mov.mes}</span>
                    {mov.notas && (
                      <>
                        <span>&middot;</span>
                        <span className="italic truncate max-w-xs">{mov.notas}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div
                    className={`font-display text-sm md:text-base font-bold ${
                      isIncome ? 'text-[#3E7C6B]' : 'text-[#A6483B]'
                    }`}
                  >
                    {isIncome ? '+' : '-'}
                    {formatCurrency(mov.monto, sym)}
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onDuplicateMovement(mov)}
                      title="Duplicar movimiento"
                      className="p-1.5 rounded-lg text-[#6B776F] hover:text-[#16241E] hover:bg-[#EEF2EE] transition-colors"
                      aria-label="Duplicar movimiento"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onEditMovement(mov)}
                      title="Editar movimiento"
                      className="p-1.5 rounded-lg text-[#6B776F] hover:text-[#16241E] hover:bg-[#EEF2EE] transition-colors"
                      aria-label="Editar movimiento"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteMovement(mov.id)}
                      title="Eliminar movimiento"
                      className="p-1.5 rounded-lg text-[#6B776F] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      aria-label="Eliminar movimiento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
