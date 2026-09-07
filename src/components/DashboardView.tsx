import React from 'react';
import { ArrowUpRight, ArrowDownRight, PiggyBank, ShieldCheck, AlertTriangle, CheckCircle2, ChevronRight, PlusCircle } from 'lucide-react';
import { Movimiento, ResumenMes, MetaAhorro, AppSettings } from '../types';
import { formatCurrency } from '../utils/finance';

interface DashboardViewProps {
  resumen: ResumenMes;
  movimientos: Movimiento[];
  metas: MetaAhorro[];
  settings: AppSettings;
  onOpenAddModal: () => void;
  onNavigateToHistory: () => void;
  onNavigateToGoals: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  resumen,
  movimientos,
  metas,
  settings,
  onOpenAddModal,
  onNavigateToHistory,
  onNavigateToGoals,
}) => {
  const { mes, ingresoTotal, totalGastado, totalAhorrado, restante, actual, regla503020 } = resumen;
  const sym = settings.simboloMoneda;

  // Rule 50/30/20 diagnostic
  const getRuleHealth = () => {
    if (ingresoTotal <= 0) {
      return {
        badge: "Sin ingresos registrados",
        text: "Registra tus ingresos de este mes para calcular las metas del 50/30/20.",
        color: "text-[#6B776F] bg-gray-100 border-gray-300",
        icon: AlertTriangle,
      };
    }
    if (regla503020.necesidadesPct > 55) {
      return {
        badge: "Necesidades elevadas (>50%)",
        text: `Tus necesidades consumen el ${regla503020.necesidadesPct}% de tus ingresos. Evalúa recortar facturas o gastos fijos.`,
        color: "text-amber-800 bg-amber-50 border-amber-200",
        icon: AlertTriangle,
      };
    }
    if (regla503020.deseosPct > 35) {
      return {
        badge: "Deseos por encima del límite (>30%)",
        text: `Estás gastando el ${regla503020.deseosPct}% en compras o salidas. Intenta frenar gastos prescindibles.`,
        color: "text-rose-800 bg-rose-50 border-rose-200",
        icon: AlertTriangle,
      };
    }
    if (regla503020.ahorrosPct >= 20) {
      return {
        badge: "¡Excelente salud financiera! (≥20% Ahorro)",
        text: `Has ahorrado o invertido el ${regla503020.ahorrosPct}%, cumpliendo con la regla 50/30/20.`,
        color: "text-[#3E7C6B] bg-[#3E7C6B]/10 border-[#3E7C6B]/30",
        icon: ShieldCheck,
      };
    }
    return {
      badge: "En camino",
      text: `Llevas un ${regla503020.ahorrosPct}% en ahorro. La meta óptima es alcanzar el 20% (${formatCurrency(regla503020.ahorrosTarget, sym)}).`,
      color: "text-[#16241E] bg-[#EEF2EE] border-[#DCE3DC]",
      icon: CheckCircle2,
    };
  };

  const health = getRuleHealth();
  const HealthIcon = health.icon;

  // Recent 5 movements of current month
  const recentMonthMovements = movimientos
    .filter((m) => m.mes === mes)
    .slice(-5)
    .reverse();

  return (
    <div className="space-y-5 pb-8 max-w-4xl mx-auto">
      {/* Hero Card */}
      <div className="bg-[#16241E] text-[#F3F1E7] rounded-2xl p-6 md:p-8 shadow-sm border border-[#233830]">
        <div className="flex items-center justify-between">
          <span className="text-xs md:text-sm uppercase tracking-wider text-[#A3B3A3] font-medium">
            Dinero Disponible en {mes}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-white font-medium border border-white/10">
            Flujo Neto
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-3">
          <span
            className={`font-display text-4xl md:text-5xl font-bold tracking-tight ${
              restante < 0 ? 'text-[#E6A79A]' : 'text-white'
            }`}
          >
            {formatCurrency(restante, sym)}
          </span>
          {restante < 0 && (
            <span className="text-xs bg-rose-900/60 text-rose-200 px-2 py-0.5 rounded font-medium">
              Déficit
            </span>
          )}
        </div>

        <p className="text-xs md:text-sm text-[#A3B3A3] mt-2">
          De un total de <span className="text-white font-semibold">{formatCurrency(ingresoTotal, sym)}</span> ingresados este mes
        </p>

        {/* Quick progress bar */}
        {ingresoTotal > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex justify-between text-xs text-[#A3B3A3] mb-1.5 font-medium">
              <span>Compromisos (Gastos + Ahorros): {formatCurrency(totalGastado + totalAhorrado, sym)}</span>
              <span>{Math.min(100, Math.round(((totalGastado + totalAhorrado) / ingresoTotal) * 100))}%</span>
            </div>
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden flex">
              <div
                className="bg-[#C9A227] h-full"
                style={{ width: `${Math.min(100, (actual.facturas / ingresoTotal) * 100)}%` }}
                title="Facturas"
              />
              <div
                className="bg-[#A6483B] h-full"
                style={{ width: `${Math.min(100, (actual.gastos / ingresoTotal) * 100)}%` }}
                title="Gastos Variables"
              />
              <div
                className="bg-[#3E7C6B] h-full"
                style={{ width: `${Math.min(100, ((actual.ahorros + actual.inversion) / ingresoTotal) * 100)}%` }}
                title="Ahorros e Inversión"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <div className="bg-white border border-[#DCE3DC] rounded-xl p-3.5 md:p-4 text-center shadow-xs">
          <div className="flex items-center justify-center gap-1 text-[11px] md:text-xs text-[#6B776F] mb-1 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5 text-[#3E7C6B]" />
            <span>Ingresos</span>
          </div>
          <div className="font-display text-base md:text-xl font-bold text-[#16241E]">
            {formatCurrency(ingresoTotal, sym)}
          </div>
        </div>

        <div className="bg-white border border-[#DCE3DC] rounded-xl p-3.5 md:p-4 text-center shadow-xs">
          <div className="flex items-center justify-center gap-1 text-[11px] md:text-xs text-[#6B776F] mb-1 font-medium">
            <ArrowDownRight className="w-3.5 h-3.5 text-[#A6483B]" />
            <span>Gastado</span>
          </div>
          <div className="font-display text-base md:text-xl font-bold text-[#A6483B]">
            {formatCurrency(totalGastado, sym)}
          </div>
        </div>

        <div className="bg-white border border-[#DCE3DC] rounded-xl p-3.5 md:p-4 text-center shadow-xs">
          <div className="flex items-center justify-center gap-1 text-[11px] md:text-xs text-[#6B776F] mb-1 font-medium">
            <PiggyBank className="w-3.5 h-3.5 text-[#3E7C6B]" />
            <span>Ahorrado</span>
          </div>
          <div className="font-display text-base md:text-xl font-bold text-[#3E7C6B]">
            {formatCurrency(totalAhorrado, sym)}
          </div>
        </div>
      </div>

      {/* Regla 50/30/20 Card */}
      <div className="bg-white border border-[#DCE3DC] rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-base md:text-lg font-bold text-[#16241E]">
              Distribución Regla 50 / 30 / 20
            </h2>
            <p className="text-xs text-[#6B776F] mt-0.5">
              Presupuesto ideal: 50% Necesidades, 30% Deseos, 20% Ahorro &amp; Inversión
            </p>
          </div>
        </div>

        {/* Health Diagnostic Banner */}
        <div className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs md:text-sm ${health.color}`}>
          <HealthIcon className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold block">{health.badge}</span>
            <p className="text-xs opacity-90 mt-0.5">{health.text}</p>
          </div>
        </div>

        {/* 3 Pillars Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* Necesidades 50% */}
          <div className="border border-[#DCE3DC] rounded-xl p-3.5 bg-[#FAFBF9]">
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-xs font-bold text-[#16241E]">50% Necesidades</span>
              <span className="text-xs font-semibold text-[#16241E]">
                {regla503020.necesidadesPct}%
              </span>
            </div>
            <div className="font-display text-lg font-bold text-[#16241E]">
              {formatCurrency(regla503020.necesidadesMonto, sym)}
            </div>
            <div className="text-[11px] text-[#6B776F] mt-0.5">
              Meta límite: {formatCurrency(regla503020.necesidadesTarget, sym)}
            </div>
            <div className="h-1.5 w-full bg-[#DCE3DC] rounded-full mt-2.5 overflow-hidden">
              <div
                className={`h-full ${regla503020.necesidadesPct > 50 ? 'bg-[#A6483B]' : 'bg-[#16241E]'}`}
                style={{ width: `${Math.min(100, (regla503020.necesidadesMonto / Math.max(regla503020.necesidadesTarget, 1)) * 100)}%` }}
              />
            </div>
          </div>

          {/* Deseos 30% */}
          <div className="border border-[#DCE3DC] rounded-xl p-3.5 bg-[#FAFBF9]">
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-xs font-bold text-[#C9A227]">30% Deseos</span>
              <span className="text-xs font-semibold text-[#C9A227]">
                {regla503020.deseosPct}%
              </span>
            </div>
            <div className="font-display text-lg font-bold text-[#16241E]">
              {formatCurrency(regla503020.deseosMonto, sym)}
            </div>
            <div className="text-[11px] text-[#6B776F] mt-0.5">
              Meta límite: {formatCurrency(regla503020.deseosTarget, sym)}
            </div>
            <div className="h-1.5 w-full bg-[#DCE3DC] rounded-full mt-2.5 overflow-hidden">
              <div
                className={`h-full ${regla503020.deseosPct > 30 ? 'bg-[#A6483B]' : 'bg-[#C9A227]'}`}
                style={{ width: `${Math.min(100, (regla503020.deseosMonto / Math.max(regla503020.deseosTarget, 1)) * 100)}%` }}
              />
            </div>
          </div>

          {/* Ahorros 20% */}
          <div className="border border-[#DCE3DC] rounded-xl p-3.5 bg-[#FAFBF9]">
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-xs font-bold text-[#3E7C6B]">20% Ahorros</span>
              <span className="text-xs font-semibold text-[#3E7C6B]">
                {regla503020.ahorrosPct}%
              </span>
            </div>
            <div className="font-display text-lg font-bold text-[#16241E]">
              {formatCurrency(regla503020.ahorrosMonto, sym)}
            </div>
            <div className="text-[11px] text-[#6B776F] mt-0.5">
              Meta ideal: {formatCurrency(regla503020.ahorrosTarget, sym)}
            </div>
            <div className="h-1.5 w-full bg-[#DCE3DC] rounded-full mt-2.5 overflow-hidden">
              <div
                className="h-full bg-[#3E7C6B]"
                style={{ width: `${Math.min(100, (regla503020.ahorrosMonto / Math.max(regla503020.ahorrosTarget, 1)) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Presupuesto vs Actual Categorías */}
      <div className="bg-white border border-[#DCE3DC] rounded-2xl p-5 md:p-6 shadow-xs space-y-3.5">
        <h2 className="font-display text-base font-bold text-[#16241E]">
          Desglose de Salidas y Reservas
        </h2>

        <div className="space-y-3">
          {[
            { label: "Facturas Fijas", amount: actual.facturas, color: "bg-amber-600" },
            { label: "Gastos Variables", amount: actual.gastos, color: "bg-rose-600" },
            { label: "Ahorro Líquido", amount: actual.ahorros, color: "bg-teal-600" },
            { label: "Inversiones", amount: actual.inversion, color: "bg-cyan-600" },
            { label: "Pago de Deudas", amount: actual.deuda, color: "bg-purple-600" },
          ].map((item) => {
            const maxVal = Math.max(ingresoTotal, 1);
            const pct = Math.min(100, (item.amount / maxVal) * 100);
            return (
              <div key={item.label}>
                <div className="flex justify-between text-xs md:text-sm font-medium mb-1">
                  <span className="text-[#16241E]">{item.label}</span>
                  <span className="font-display font-semibold text-[#16241E]">
                    {formatCurrency(item.amount, sym)}
                  </span>
                </div>
                <div className="h-2 w-full bg-[#EEF2EE] rounded-full overflow-hidden">
                  <div className={`h-full ${item.color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metas de Ahorro Snapshot */}
      {metas.length > 0 && (
        <div className="bg-white border border-[#DCE3DC] rounded-2xl p-5 md:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-bold text-[#16241E]">
              Tus Metas Activas
            </h2>
            <button
              onClick={onNavigateToGoals}
              className="text-xs font-semibold text-[#3E7C6B] hover:underline inline-flex items-center gap-0.5"
            >
              <span>Ver todas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {metas.slice(0, 2).map((m) => {
              const pct = Math.min(100, Math.round((m.acumulado / Math.max(m.objetivo, 1)) * 100));
              return (
                <div key={m.id} className="border border-[#DCE3DC] rounded-xl p-3.5 bg-[#FAFBF9]">
                  <div className="flex justify-between items-start text-xs font-medium mb-1.5">
                    <span className="font-semibold text-[#16241E] truncate pr-2">{m.nombre}</span>
                    <span className="text-[#3E7C6B] font-bold">{pct}%</span>
                  </div>
                  <div className="text-sm font-display font-bold text-[#16241E] mb-2">
                    {formatCurrency(m.acumulado, sym)}{' '}
                    <span className="text-xs font-normal text-[#6B776F]">
                      / {formatCurrency(m.objetivo, sym)}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[#DCE3DC] rounded-full overflow-hidden">
                    <div className="h-full bg-[#3E7C6B]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Movements Snapshot */}
      <div className="bg-white border border-[#DCE3DC] rounded-2xl p-5 md:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-base font-bold text-[#16241E]">
            Últimos Movimientos de {mes}
          </h2>
          <button
            onClick={onNavigateToHistory}
            className="text-xs font-semibold text-[#3E7C6B] hover:underline inline-flex items-center gap-0.5"
          >
            <span>Ver historial completo</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentMonthMovements.length === 0 ? (
          <div className="text-center py-6 text-[#6B776F] text-xs">
            <p>No tienes movimientos registrados en {mes}.</p>
            <button
              onClick={onOpenAddModal}
              className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#16241E] bg-[#EEF2EE] hover:bg-[#DCE3DC] px-3 py-1.5 rounded-lg transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Registrar primer movimiento</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#DCE3DC]">
            {recentMonthMovements.map((mov) => {
              const isIncome = mov.tipo === 'Ingreso';
              return (
                <div key={mov.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-[#16241E]">{mov.concepto}</div>
                    <div className="text-[11px] text-[#6B776F] mt-0.5">
                      {mov.tipo} &middot; {mov.fecha} {mov.necesidad ? `&middot; ${mov.necesidad}` : ''}
                    </div>
                  </div>
                  <div
                    className={`font-display font-semibold text-sm md:text-base ${
                      isIncome ? 'text-[#3E7C6B]' : 'text-[#A6483B]'
                    }`}
                  >
                    {isIncome ? '+' : '-'}
                    {formatCurrency(mov.monto, sym)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
