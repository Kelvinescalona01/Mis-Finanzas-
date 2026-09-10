import React, { useState } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  PlusCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Calendar,
  Percent,
  BarChart3,
  PieChart as PieChartIcon,
  FileSpreadsheet,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import { Movimiento, ResumenMes, MetaAhorro, AppSettings } from '../types';
import {
  formatCurrency,
  calculateAnnualOverview,
  calculateCategoryBreakdown,
  calculateFinancialKPIs,
} from '../utils/finance';
import { MESES } from '../data/initialData';

interface DashboardViewProps {
  resumen: ResumenMes;
  movimientos: Movimiento[];
  metas: MetaAhorro[];
  settings: AppSettings;
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  onOpenAddModal: () => void;
  onNavigateToHistory: () => void;
  onNavigateToGoals: () => void;
  onNavigateToSettings?: () => void;
  onTriggerSync?: () => void;
  isSyncing?: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  resumen,
  movimientos,
  metas,
  settings,
  selectedMonth,
  onSelectMonth,
  onOpenAddModal,
  onNavigateToHistory,
  onNavigateToGoals,
  onNavigateToSettings,
  onTriggerSync,
  isSyncing,
}) => {
  const [chartMode, setChartMode] = useState<'bars' | 'area'>('bars');
  const { mes, ingresoTotal, totalGastado, totalAhorrado, restante, actual, regla503020 } = resumen;
  const sym = settings.simboloMoneda;

  // Annual Overview Data
  const annualData = calculateAnnualOverview(movimientos);

  // Category breakdown for current month
  const categoryData = calculateCategoryBreakdown(movimientos, mes);

  // Financial KPIs
  const kpis = calculateFinancialKPIs(movimientos, mes, ingresoTotal, totalGastado, totalAhorrado);

  // 50/30/20 Donut Chart Data
  const donutData = [
    {
      name: 'Necesidades (50%)',
      value: Math.max(0, regla503020.necesidadesMonto),
      target: regla503020.necesidadesTarget,
      color: '#16241E',
      pct: regla503020.necesidadesPct,
    },
    {
      name: 'Deseos (30%)',
      value: Math.max(0, regla503020.deseosMonto),
      target: regla503020.deseosTarget,
      color: '#C9A227',
      pct: regla503020.deseosPct,
    },
    {
      name: 'Ahorro e Inversión (20%)',
      value: Math.max(0, regla503020.ahorrosMonto),
      target: regla503020.ahorrosTarget,
      color: '#3E7C6B',
      pct: regla503020.ahorrosPct,
    },
  ];

  // Rule 50/30/20 diagnostic
  const getRuleHealth = () => {
    if (ingresoTotal <= 0) {
      return {
        badge: 'Sin ingresos registrados',
        text: `Registra tus ingresos de ${mes} para calcular las metas del 50/30/20.`,
        color: 'text-[#6B776F] bg-gray-100 border-gray-300',
        icon: AlertTriangle,
      };
    }
    if (regla503020.necesidadesPct > 55) {
      return {
        badge: 'Necesidades elevadas (>50%)',
        text: `Tus necesidades consumen el ${regla503020.necesidadesPct}% de tus ingresos (${formatCurrency(
          regla503020.necesidadesMonto,
          sym
        )} de ${formatCurrency(regla503020.necesidadesTarget, sym)} sugerido). Evalúa optimizar facturas fijas.`,
        color: 'text-amber-800 bg-amber-50 border-amber-200',
        icon: AlertTriangle,
      };
    }
    if (regla503020.deseosPct > 35) {
      return {
        badge: 'Deseos por encima del límite (>30%)',
        text: `Estás gastando el ${regla503020.deseosPct}% en compras o salidas (${formatCurrency(
          regla503020.deseosMonto,
          sym
        )} vs meta ${formatCurrency(regla503020.deseosTarget, sym)}). Modera los gastos prescindibles.`,
        color: 'text-rose-800 bg-rose-50 border-rose-200',
        icon: AlertTriangle,
      };
    }
    if (regla503020.ahorrosPct >= 20) {
      return {
        badge: '¡Excelente salud financiera! (≥20% Ahorro)',
        text: `Has ahorrado o invertido el ${regla503020.ahorrosPct}%, cumpliendo satisfactoriamente con la regla 50/30/20.`,
        color: 'text-[#3E7C6B] bg-[#3E7C6B]/10 border-[#3E7C6B]/30',
        icon: ShieldCheck,
      };
    }
    return {
      badge: 'En camino hacia la meta 50/30/20',
      text: `Llevas un ${regla503020.ahorrosPct}% en ahorro. La meta óptima es alcanzar el 20% (${formatCurrency(
        regla503020.ahorrosTarget,
        sym
      )}). Te faltan ${formatCurrency(
        Math.max(0, regla503020.ahorrosTarget - regla503020.ahorrosMonto),
        sym
      )} para la meta.`,
      color: 'text-[#16241E] bg-[#EEF2EE] border-[#DCE3DC]',
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

  // Custom Recharts Tooltip for currency
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#16241E] text-white p-3 rounded-xl shadow-lg border border-[#233830] text-xs space-y-1 z-50">
          <p className="font-bold text-sm text-[#F3F1E7] mb-1">{label}</p>
          {payload.map((p: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5" style={{ color: p.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                <span>{p.name}:</span>
              </span>
              <span className="font-mono font-semibold">{formatCurrency(p.value, sym)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div id="dashboard-view-container" className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* 1. Fast Month Switcher Bar */}
      <div className="bg-white border border-[#DCE3DC] rounded-2xl p-3 shadow-xs">
        <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none py-1 px-1">
          {MESES.map((m) => {
            const isSelected = m === selectedMonth;
            const monthMovements = movimientos.filter((item) => item.mes === m);
            const hasData = monthMovements.length > 0;

            return (
              <button
                key={m}
                id={`month-btn-${m.toLowerCase()}`}
                onClick={() => onSelectMonth(m)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-[#16241E] text-white shadow-xs'
                    : hasData
                    ? 'bg-[#EEF2EE] text-[#16241E] hover:bg-[#DCE3DC]'
                    : 'text-[#6B776F] hover:bg-gray-100 hover:text-[#16241E]'
                }`}
              >
                <span>{m}</span>
                {hasData && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-[#3E7C6B]' : 'bg-[#16241E]'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Google Drive / Excel / Firestore Status Card */}
      <div className="bg-white border border-[#DCE3DC] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#3E7C6B]/10 text-[#3E7C6B] flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-bold text-[#6B776F]">
                Sincronización en la Nube
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Base de Datos Activa</span>
              </span>
            </div>
            <p className="text-xs md:text-sm text-[#16241E] font-medium mt-0.5">
              {settings.googleSpreadsheetTitle || 'Presupuesto_Mensual_50_30_20.xlsx'}
              {settings.lastSyncedAt && (
                <span className="text-[#6B776F] text-xs ml-2 font-normal">
                  (Último sync: {settings.lastSyncedAt})
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onTriggerSync && (
            <button
              id="dashboard-sync-btn"
              onClick={onTriggerSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-[#16241E] text-white hover:bg-[#233830] transition-colors disabled:opacity-50"
              title="Sincronizar movimientos con Google Drive y la Base de Datos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}</span>
            </button>
          )}

          {onNavigateToSettings && (
            <button
              id="dashboard-settings-btn"
              onClick={onNavigateToSettings}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-2 rounded-xl border border-[#DCE3DC] text-[#16241E] hover:bg-[#EEF2EE] transition-colors"
              title="Ajustes de sincronización"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Configurar Drive</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Hero Available Balance Card */}
      <div className="bg-[#16241E] text-[#F3F1E7] rounded-2xl p-6 md:p-8 shadow-sm border border-[#233830]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm uppercase tracking-wider text-[#A3B3A3] font-semibold">
              Dinero Disponible en {mes}
            </span>
          </div>
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
            <span className="text-xs bg-rose-900/60 text-rose-200 px-2.5 py-1 rounded-lg font-semibold">
              Déficit
            </span>
          )}
        </div>

        <p className="text-xs md:text-sm text-[#A3B3A3] mt-2">
          De un total de <span className="text-white font-semibold">{formatCurrency(ingresoTotal, sym)}</span> ingresados este mes
        </p>

        {/* Progress Bar of Commitments */}
        {ingresoTotal > 0 && (
          <div className="mt-5 pt-4 border-t border-white/10">
            <div className="flex justify-between text-xs text-[#A3B3A3] mb-2 font-medium">
              <span>Compromisos Totales (Gastos + Ahorros): {formatCurrency(totalGastado + totalAhorrado, sym)}</span>
              <span>{Math.min(100, Math.round(((totalGastado + totalAhorrado) / ingresoTotal) * 100))}% consumido</span>
            </div>
            <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden flex">
              <div
                className="bg-[#C9A227] h-full transition-all duration-300"
                style={{ width: `${Math.min(100, (actual.facturas / ingresoTotal) * 100)}%` }}
                title={`Facturas: ${formatCurrency(actual.facturas, sym)}`}
              />
              <div
                className="bg-[#A6483B] h-full transition-all duration-300"
                style={{ width: `${Math.min(100, (actual.gastos / ingresoTotal) * 100)}%` }}
                title={`Gastos Variables: ${formatCurrency(actual.gastos, sym)}`}
              />
              <div
                className="bg-[#3E7C6B] h-full transition-all duration-300"
                style={{ width: `${Math.min(100, ((actual.ahorros + actual.inversion) / ingresoTotal) * 100)}%` }}
                title={`Ahorros e Inversiones: ${formatCurrency(actual.ahorros + actual.inversion, sym)}`}
              />
            </div>
            <div className="flex items-center gap-4 text-[11px] text-[#A3B3A3] mt-2 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#C9A227]" /> Facturas Fijas ({formatCurrency(actual.facturas, sym)})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#A6483B]" /> Gastos Variables ({formatCurrency(actual.gastos, sym)})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#3E7C6B]" /> Ahorros ({formatCurrency(actual.ahorros + actual.inversion, sym)})
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Expanded Financial KPIs Grid (6 cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Ingresos */}
        <div className="bg-white border border-[#DCE3DC] rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#6B776F] mb-1 font-medium">
            <span>Ingresos</span>
            <ArrowUpRight className="w-4 h-4 text-[#3E7C6B]" />
          </div>
          <div className="font-display text-base md:text-lg font-bold text-[#16241E]">
            {formatCurrency(ingresoTotal, sym)}
          </div>
          <div className="text-[11px] text-[#6B776F] mt-0.5">En {mes}</div>
        </div>

        {/* Gastado */}
        <div className="bg-white border border-[#DCE3DC] rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#6B776F] mb-1 font-medium">
            <span>Gastado</span>
            <ArrowDownRight className="w-4 h-4 text-[#A6483B]" />
          </div>
          <div className="font-display text-base md:text-lg font-bold text-[#A6483B]">
            {formatCurrency(totalGastado, sym)}
          </div>
          <div className="text-[11px] text-[#6B776F] mt-0.5">Facturas + Gastos</div>
        </div>

        {/* Ahorrado */}
        <div className="bg-white border border-[#DCE3DC] rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#6B776F] mb-1 font-medium">
            <span>Ahorrado</span>
            <PiggyBank className="w-4 h-4 text-[#3E7C6B]" />
          </div>
          <div className="font-display text-base md:text-lg font-bold text-[#3E7C6B]">
            {formatCurrency(totalAhorrado, sym)}
          </div>
          <div className="text-[11px] text-[#6B776F] mt-0.5">Líquido + Inversión</div>
        </div>

        {/* Tasa de Ahorro */}
        <div className="bg-white border border-[#DCE3DC] rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#6B776F] mb-1 font-medium">
            <span>Tasa de Ahorro</span>
            <Percent className="w-4 h-4 text-[#3E7C6B]" />
          </div>
          <div className="font-display text-base md:text-lg font-bold text-[#16241E]">
            {kpis.tasaAhorro}%
          </div>
          <div className="text-[11px] mt-0.5 font-medium">
            {kpis.tasaAhorro >= 20 ? (
              <span className="text-[#3E7C6B]">Meta 20% Lograda ✓</span>
            ) : (
              <span className="text-[#C9A227]">Objetivo: 20%</span>
            )}
          </div>
        </div>

        {/* Gasto Diario Promedio */}
        <div className="bg-white border border-[#DCE3DC] rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#6B776F] mb-1 font-medium">
            <span>Gasto Diario</span>
            <Calendar className="w-4 h-4 text-[#6B776F]" />
          </div>
          <div className="font-display text-base md:text-lg font-bold text-[#16241E]">
            {formatCurrency(kpis.gastoDiario, sym)}
          </div>
          <div className="text-[11px] text-[#6B776F] mt-0.5">Día {kpis.diasTranscurridos} de {kpis.diasTotalesMes}</div>
        </div>

        {/* Proyección Fin de Mes */}
        <div className="bg-white border border-[#DCE3DC] rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#6B776F] mb-1 font-medium">
            <span>Proyección Mes</span>
            {kpis.proyeccionFinMes >= 0 ? (
              <TrendingUp className="w-4 h-4 text-[#3E7C6B]" />
            ) : (
              <TrendingDown className="w-4 h-4 text-[#A6483B]" />
            )}
          </div>
          <div
            className={`font-display text-base md:text-lg font-bold ${
              kpis.proyeccionFinMes >= 0 ? 'text-[#3E7C6B]' : 'text-[#A6483B]'
            }`}
          >
            {formatCurrency(kpis.proyeccionFinMes, sym)}
          </div>
          <div className="text-[11px] text-[#6B776F] mt-0.5">Saldo proyectado</div>
        </div>
      </div>

      {/* 5. Regla 50/30/20 with Donut Chart and Health Diagnostic */}
      <div className="bg-white border border-[#DCE3DC] rounded-2xl p-5 md:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DCE3DC] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-bold text-[#16241E]">
                Distribución Regla 50 / 30 / 20
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#3E7C6B]/10 text-[#3E7C6B] font-semibold">
                Método Oficial
              </span>
            </div>
            <p className="text-xs text-[#6B776F] mt-0.5">
              50% para Necesidades básicas, 30% para Deseos o estilo de vida, 20% para Ahorros e Inversión.
            </p>
          </div>
        </div>

        {/* Health Diagnostic Banner */}
        <div className={`p-4 rounded-xl border flex items-start gap-3.5 text-xs md:text-sm ${health.color}`}>
          <HealthIcon className="w-5 h-5 mt-0.5 shrink-0" />
          <div className="flex-1">
            <span className="font-bold block text-sm">{health.badge}</span>
            <p className="text-xs opacity-90 mt-1 leading-relaxed">{health.text}</p>
          </div>
        </div>

        {/* Chart + 3 Pillars Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Donut Chart (Recharts) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-3 bg-[#FAFBF9] rounded-2xl border border-[#DCE3DC]">
            <div className="w-full h-56 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val) || 0, sym), 'Monto ejecutado']}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Text inside Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[11px] text-[#6B776F] uppercase font-bold tracking-wider">
                  Ahorro
                </span>
                <span className="font-display text-2xl font-bold text-[#3E7C6B]">
                  {regla503020.ahorrosPct}%
                </span>
                <span className="text-[10px] text-[#6B776F]">Meta: 20%</span>
              </div>
            </div>

            {/* Donut Legend */}
            <div className="w-full flex items-center justify-around gap-2 text-[11px] font-semibold text-[#16241E] pt-2 border-t border-[#DCE3DC]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16241E]" /> Necesidades ({regla503020.necesidadesPct}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C9A227]" /> Deseos ({regla503020.deseosPct}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3E7C6B]" /> Ahorros ({regla503020.ahorrosPct}%)
              </span>
            </div>
          </div>

          {/* 3 Pillars Column Breakdown */}
          <div className="lg:col-span-7 space-y-3">
            {/* Necesidades 50% */}
            <div className="border border-[#DCE3DC] rounded-xl p-4 bg-[#FAFBF9]">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-xs font-bold text-[#16241E] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#16241E]" />
                  <span>50% Necesidades Básicas</span>
                </span>
                <span className="text-xs font-semibold text-[#16241E]">
                  {regla503020.necesidadesPct}% del ingreso
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <div className="font-display text-lg font-bold text-[#16241E]">
                  {formatCurrency(regla503020.necesidadesMonto, sym)}
                </div>
                <div className="text-xs text-[#6B776F]">
                  Límite sugerido: {formatCurrency(regla503020.necesidadesTarget, sym)}
                </div>
              </div>
              <div className="h-2 w-full bg-[#DCE3DC] rounded-full mt-2.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    regla503020.necesidadesPct > 50 ? 'bg-[#A6483B]' : 'bg-[#16241E]'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      (regla503020.necesidadesMonto / Math.max(regla503020.necesidadesTarget, 1)) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Deseos 30% */}
            <div className="border border-[#DCE3DC] rounded-xl p-4 bg-[#FAFBF9]">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-xs font-bold text-[#C9A227] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#C9A227]" />
                  <span>30% Deseos y Salidas</span>
                </span>
                <span className="text-xs font-semibold text-[#C9A227]">
                  {regla503020.deseosPct}% del ingreso
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <div className="font-display text-lg font-bold text-[#16241E]">
                  {formatCurrency(regla503020.deseosMonto, sym)}
                </div>
                <div className="text-xs text-[#6B776F]">
                  Límite sugerido: {formatCurrency(regla503020.deseosTarget, sym)}
                </div>
              </div>
              <div className="h-2 w-full bg-[#DCE3DC] rounded-full mt-2.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    regla503020.deseosPct > 30 ? 'bg-[#A6483B]' : 'bg-[#C9A227]'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      (regla503020.deseosMonto / Math.max(regla503020.deseosTarget, 1)) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Ahorros 20% */}
            <div className="border border-[#DCE3DC] rounded-xl p-4 bg-[#FAFBF9]">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-xs font-bold text-[#3E7C6B] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#3E7C6B]" />
                  <span>20% Ahorro e Inversión</span>
                </span>
                <span className="text-xs font-semibold text-[#3E7C6B]">
                  {regla503020.ahorrosPct}% del ingreso
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <div className="font-display text-lg font-bold text-[#16241E]">
                  {formatCurrency(regla503020.ahorrosMonto, sym)}
                </div>
                <div className="text-xs text-[#6B776F]">
                  Meta óptima: {formatCurrency(regla503020.ahorrosTarget, sym)}
                </div>
              </div>
              <div className="h-2 w-full bg-[#DCE3DC] rounded-full mt-2.5 overflow-hidden">
                <div
                  className="h-full bg-[#3E7C6B] transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      (regla503020.ahorrosMonto / Math.max(regla503020.ahorrosTarget, 1)) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Annual Cashflow Multi-chart (Recharts Bar & Area) */}
      <div className="bg-white border border-[#DCE3DC] rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#16241E]" />
              <h2 className="font-display text-lg font-bold text-[#16241E]">
                Tendencia Anual de Finanzas
              </h2>
            </div>
            <p className="text-xs text-[#6B776F] mt-0.5">
              Comparativa de Ingresos, Gastos y Ahorros de los 12 meses del año
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#EEF2EE] rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setChartMode('bars')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                chartMode === 'bars'
                  ? 'bg-white text-[#16241E] shadow-xs'
                  : 'text-[#6B776F] hover:text-[#16241E]'
              }`}
            >
              Barras Comparativas
            </button>
            <button
              onClick={() => setChartMode('area')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                chartMode === 'area'
                  ? 'bg-white text-[#16241E] shadow-xs'
                  : 'text-[#6B776F] hover:text-[#16241E]'
              }`}
            >
              Balance Neto
            </button>
          </div>
        </div>

        <div className="w-full h-72 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === 'bars' ? (
              <BarChart data={annualData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2EE" />
                <XAxis dataKey="mesCorto" tick={{ fill: '#6B776F', fontSize: 12 }} />
                <YAxis
                  tick={{ fill: '#6B776F', fontSize: 11 }}
                  tickFormatter={(val) => `${sym}${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
                  formatter={(val) => <span className="text-xs font-medium text-[#16241E]">{val}</span>}
                />
                <Bar dataKey="ingresos" name="Ingresos" fill="#3E7C6B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gastos" name="Gastos" fill="#A6483B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ahorros" name="Ahorros" fill="#C9A227" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <AreaChart data={annualData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3E7C6B" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3E7C6B" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2EE" />
                <XAxis dataKey="mesCorto" tick={{ fill: '#6B776F', fontSize: 12 }} />
                <YAxis
                  tick={{ fill: '#6B776F', fontSize: 11 }}
                  tickFormatter={(val) => `${sym}${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Area
                  type="monotone"
                  dataKey="balance"
                  name="Balance Neto"
                  stroke="#3E7C6B"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#balanceGradient)"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 7. Category Breakdown & Active Metas Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Top Expense Categories Breakdown */}
        <div className="bg-white border border-[#DCE3DC] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-[#16241E]">
              Categorías de Gasto en {mes}
            </h2>
            <span className="text-xs text-[#6B776F]">Top Gastos</span>
          </div>

          {categoryData.length === 0 ? (
            <div className="py-8 text-center text-[#6B776F] text-xs">
              No hay salidas registradas en {mes}.
            </div>
          ) : (
            <div className="space-y-3">
              {categoryData.map((cat, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-[#16241E] truncate max-w-[180px]">{cat.name}</span>
                    <span className="text-[#16241E] font-mono">
                      {formatCurrency(cat.value, sym)}{' '}
                      <span className="text-[#6B776F] font-normal">({cat.percentage}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[#EEF2EE] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Metas de Ahorro Snapshot */}
        <div className="bg-white border border-[#DCE3DC] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-bold text-[#16241E]">
                Metas de Ahorro Activas
              </h2>
              <button
                id="view-all-goals-btn"
                onClick={onNavigateToGoals}
                className="text-xs font-semibold text-[#3E7C6B] hover:underline inline-flex items-center gap-0.5"
              >
                <span>Ver todas</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {metas.length === 0 ? (
              <div className="text-center py-8 text-[#6B776F] text-xs space-y-2">
                <p>No tienes metas de ahorro registradas.</p>
                <button
                  onClick={onNavigateToGoals}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#3E7C6B] bg-[#3E7C6B]/10 px-3 py-1.5 rounded-lg"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Crear meta de ahorro</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {metas.slice(0, 3).map((m) => {
                  const pct = Math.min(100, Math.round((m.acumulado / Math.max(m.objetivo, 1)) * 100));
                  return (
                    <div key={m.id} className="border border-[#DCE3DC] rounded-xl p-3.5 bg-[#FAFBF9]">
                      <div className="flex justify-between items-start text-xs font-medium mb-1.5">
                        <span className="font-bold text-[#16241E] truncate pr-2">{m.nombre}</span>
                        <span className="text-[#3E7C6B] font-bold">{pct}%</span>
                      </div>
                      <div className="text-sm font-display font-bold text-[#16241E] mb-2">
                        {formatCurrency(m.acumulado, sym)}{' '}
                        <span className="text-xs font-normal text-[#6B776F]">
                          / {formatCurrency(m.objetivo, sym)}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-[#DCE3DC] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#3E7C6B] transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#DCE3DC] flex items-center justify-between text-xs text-[#6B776F]">
            <span>Total acumulado en metas:</span>
            <span className="font-bold text-[#16241E]">
              {formatCurrency(
                metas.reduce((acc, curr) => acc + (Number(curr.acumulado) || 0), 0),
                sym
              )}
            </span>
          </div>
        </div>
      </div>

      {/* 8. Recent Movements Snapshot */}
      <div className="bg-white border border-[#DCE3DC] rounded-2xl p-5 md:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-base md:text-lg font-bold text-[#16241E]">
              Últimos Movimientos en {mes}
            </h2>
            <p className="text-xs text-[#6B776F] mt-0.5">
              Transacciones registradas en la app y sincronizadas en tu Excel
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="dashboard-add-movement-btn"
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#16241E] text-white hover:bg-[#233830] transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Añadir</span>
            </button>

            <button
              id="view-all-history-btn"
              onClick={onNavigateToHistory}
              className="text-xs font-semibold text-[#3E7C6B] hover:underline inline-flex items-center gap-0.5"
            >
              <span>Ver historial</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {recentMonthMovements.length === 0 ? (
          <div className="text-center py-8 text-[#6B776F] text-xs">
            <p>No tienes movimientos registrados en {mes}.</p>
            <button
              onClick={onOpenAddModal}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#16241E] bg-[#EEF2EE] hover:bg-[#DCE3DC] px-3.5 py-2 rounded-xl transition-colors"
            >
              <PlusCircle className="w-4 h-4 text-[#3E7C6B]" />
              <span>Registrar primer movimiento en {mes}</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#DCE3DC]">
            {recentMonthMovements.map((mov) => {
              const isIncome = mov.tipo === 'Ingreso';
              return (
                <div key={mov.id} className="py-3 flex items-center justify-between hover:bg-[#FAFBF9] px-2 rounded-lg transition-colors">
                  <div>
                    <div className="text-sm font-semibold text-[#16241E]">{mov.concepto}</div>
                    <div className="text-xs text-[#6B776F] mt-0.5 flex items-center gap-2">
                      <span>{mov.tipo}</span>
                      <span>&middot;</span>
                      <span>{mov.fecha}</span>
                      {mov.necesidad && (
                        <>
                          <span>&middot;</span>
                          <span className="px-1.5 py-0.2 rounded bg-gray-100 text-[10px] font-medium text-[#16241E]">
                            {mov.necesidad}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div
                    className={`font-display font-bold text-sm md:text-base ${
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
