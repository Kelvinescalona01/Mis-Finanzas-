import React, { useState } from 'react';
import { Target, Plus, CheckCircle2, Trash2, Trophy, Calendar, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { MetaAhorro, AppSettings } from '../types';
import { formatCurrency } from '../utils/finance';

interface SavingsGoalsViewProps {
  metas: MetaAhorro[];
  onSaveGoal: (goal: MetaAhorro) => void;
  onDeleteGoal: (id: string) => void;
  onContributeToGoal: (goalId: string, amount: number) => void;
  settings: AppSettings;
}

export const SavingsGoalsView: React.FC<SavingsGoalsViewProps> = ({
  metas,
  onSaveGoal,
  onDeleteGoal,
  onContributeToGoal,
  settings,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<MetaAhorro | null>(null);

  // New goal form state
  const [nombre, setNombre] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [acumulado, setAcumulado] = useState('');
  const [fechaLimite, setFechaLimite] = useState('');

  // Contribution form state
  const [contribAmount, setContribAmount] = useState('');
  const [createMovement, setCreateMovement] = useState(true);

  const sym = settings.simboloMoneda;

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const objVal = parseFloat(objetivo);
    const acumVal = parseFloat(acumulado) || 0;
    if (!nombre.trim() || isNaN(objVal) || objVal <= 0) return;

    const newGoal: MetaAhorro = {
      id: `meta-${Date.now()}`,
      nombre: nombre.trim(),
      objetivo: objVal,
      acumulado: acumVal,
      color: '#3E7C6B',
      fechaLimite: fechaLimite || undefined,
    };

    onSaveGoal(newGoal);
    setNombre('');
    setObjetivo('');
    setAcumulado('');
    setFechaLimite('');
    setIsModalOpen(false);
  };

  const handleContribute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    const amount = parseFloat(contribAmount);
    if (isNaN(amount) || amount <= 0) return;

    const newTotal = selectedGoal.acumulado + amount;
    if (newTotal >= selectedGoal.objetivo && selectedGoal.acumulado < selectedGoal.objetivo) {
      // Goal achieved! Celebrate with confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }

    onContributeToGoal(selectedGoal.id, amount);
    setContribAmount('');
    setIsContributeModalOpen(false);
  };

  const totalObjetivos = metas.reduce((acc, m) => acc + m.objetivo, 0);
  const totalAhorradoMetas = metas.reduce((acc, m) => acc + m.acumulado, 0);
  const totalProgreso = totalObjetivos > 0 ? Math.round((totalAhorradoMetas / totalObjetivos) * 100) : 0;

  return (
    <div className="space-y-5 pb-8 max-w-4xl mx-auto">
      {/* Overview Banner */}
      <div className="bg-[#16241E] text-[#F3F1E7] rounded-2xl p-6 shadow-sm border border-[#233830]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#A3B3A3] font-medium">
              <Trophy className="w-4 h-4 text-[#C9A227]" />
              <span>Metas y Fondos de Ahorro</span>
            </div>
            <div className="font-display text-3xl font-bold mt-1 text-white">
              {formatCurrency(totalAhorradoMetas, sym)}{' '}
              <span className="text-sm font-normal text-[#A3B3A3]">
                de {formatCurrency(totalObjetivos, sym)} acumulados ({totalProgreso}%)
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 bg-[#C9A227] hover:bg-[#b59120] text-[#16241E] px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nueva Meta</span>
          </button>
        </div>

        {/* Global Progress */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#3E7C6B]" style={{ width: `${Math.min(100, totalProgreso)}%` }} />
          </div>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metas.map((goal) => {
          const pct = Math.min(100, Math.round((goal.acumulado / Math.max(goal.objetivo, 1)) * 100));
          const isComplete = goal.acumulado >= goal.objetivo;

          return (
            <div
              key={goal.id}
              className="bg-white border border-[#DCE3DC] rounded-2xl p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#EEF2EE] flex items-center justify-center text-[#3E7C6B]">
                      {isComplete ? (
                        <CheckCircle2 className="w-4 h-4 text-[#3E7C6B]" />
                      ) : (
                        <Target className="w-4 h-4 text-[#16241E]" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-[#16241E]">{goal.nombre}</h3>
                      {goal.fechaLimite && (
                        <div className="text-[11px] text-[#6B776F] flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Meta: {goal.fechaLimite}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteGoal(goal.id)}
                    className="text-[#6B776F] hover:text-rose-600 p-1 rounded-lg transition-colors"
                    title="Eliminar meta"
                    aria-label="Eliminar meta"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between items-baseline mb-1 text-xs">
                    <span className="font-display text-lg font-bold text-[#16241E]">
                      {formatCurrency(goal.acumulado, sym)}
                    </span>
                    <span className="text-[#6B776F]">
                      Objetivo: {formatCurrency(goal.objetivo, sym)}
                    </span>
                  </div>

                  <div className="h-2.5 w-full bg-[#EEF2EE] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${isComplete ? 'bg-[#3E7C6B]' : 'bg-[#16241E]'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] font-semibold mt-1.5 text-[#6B776F]">
                    <span>{pct}% completado</span>
                    <span>
                      {isComplete
                        ? '¡Meta lograda! 🎉'
                        : `Faltan ${formatCurrency(Math.max(0, goal.objetivo - goal.acumulado), sym)}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="mt-4 pt-3 border-t border-[#DCE3DC] flex justify-end">
                <button
                  onClick={() => {
                    setSelectedGoal(goal);
                    setIsContributeModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#EEF2EE] hover:bg-[#DCE3DC] text-[#16241E] transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>Aportar dinero</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Goal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-xl border border-[#DCE3DC]">
            <h3 className="font-display text-lg font-bold text-[#16241E] mb-3">
              Crear Nueva Meta de Ahorro
            </h3>

            <form onSubmit={handleCreateGoal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#16241E] mb-1">
                  Nombre de la meta
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Fondo de emergencia, Viaje a la playa..."
                  className="w-full bg-white border border-[#DCE3DC] rounded-xl px-3 py-2 text-xs text-[#16241E] focus:outline-none focus:ring-2 focus:ring-[#3E7C6B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#16241E] mb-1">
                    Objetivo total ({sym})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={objetivo}
                    onChange={(e) => setObjetivo(e.target.value)}
                    placeholder="25000"
                    className="w-full bg-white border border-[#DCE3DC] rounded-xl px-3 py-2 text-xs text-[#16241E] focus:outline-none focus:ring-2 focus:ring-[#3E7C6B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#16241E] mb-1">
                    Monto inicial ({sym})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={acumulado}
                    onChange={(e) => setAcumulado(e.target.value)}
                    placeholder="0"
                    className="w-full bg-white border border-[#DCE3DC] rounded-xl px-3 py-2 text-xs text-[#16241E] focus:outline-none focus:ring-2 focus:ring-[#3E7C6B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#16241E] mb-1">
                  Fecha límite estimada (Opcional)
                </label>
                <input
                  type="date"
                  value={fechaLimite}
                  onChange={(e) => setFechaLimite(e.target.value)}
                  className="w-full bg-white border border-[#DCE3DC] rounded-xl px-3 py-2 text-xs text-[#16241E] focus:outline-none focus:ring-2 focus:ring-[#3E7C6B]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 border border-[#DCE3DC] rounded-xl text-xs font-semibold text-[#16241E]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#16241E] text-white rounded-xl text-xs font-semibold hover:bg-[#233830]"
                >
                  Guardar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribute Modal */}
      {isContributeModalOpen && selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl border border-[#DCE3DC]">
            <h3 className="font-display text-base font-bold text-[#16241E]">
              Aportar a {selectedGoal.nombre}
            </h3>
            <p className="text-xs text-[#6B776F] mt-0.5 mb-3">
              Actualmente tienes {formatCurrency(selectedGoal.acumulado, sym)} ahorrados
            </p>

            <form onSubmit={handleContribute} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#16241E] mb-1">
                  Monto a ingresar ({sym})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  autoFocus
                  value={contribAmount}
                  onChange={(e) => setContribAmount(e.target.value)}
                  placeholder="500.00"
                  className="w-full bg-white border border-[#DCE3DC] rounded-xl px-3 py-2 text-sm font-semibold text-[#16241E] focus:outline-none focus:ring-2 focus:ring-[#3E7C6B]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsContributeModalOpen(false)}
                  className="flex-1 py-2 border border-[#DCE3DC] rounded-xl text-xs font-semibold text-[#16241E]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#16241E] text-white rounded-xl text-xs font-semibold hover:bg-[#233830]"
                >
                  Confirmar Aporte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
