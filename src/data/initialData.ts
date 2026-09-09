import { Movimiento, MetaAhorro, AppSettings } from '../types';

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
] as const;

export const TIPOS_MOVIMIENTO: { value: Movimiento['tipo']; label: string; color: string; bg: string }[] = [
  { value: "Ingreso", label: "Ingreso", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  { value: "Factura", label: "Factura Fija", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  { value: "GastoVariable", label: "Gasto Variable", color: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
  { value: "Ahorro", label: "Ahorro", color: "text-teal-700", bg: "bg-teal-50 border-teal-200" },
  { value: "Inversion", label: "Inversión", color: "text-cyan-700", bg: "bg-cyan-50 border-cyan-200" },
  { value: "Deuda", label: "Pago Deuda", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
];

export const CATEGORIAS_COMUNES = [
  "Mercado y Despensa",
  "Renta / Hipoteca",
  "Servicios (Luz, Agua, Gas)",
  "Internet y Telefonía",
  "Transporte y Gasolina",
  "Restaurantes y Salidas",
  "Suscripciones y Streaming",
  "Cuidado Personal y Salud",
  "Ropa y Calzado",
  "Educación y Cursos",
  "Mascotas",
  "Fondo de Emergencia",
  "Afore / Retiro",
  "Bolsa e Inversiones",
  "Tarjeta de Crédito",
  "Otros Gastos"
];

export const SUGERENCIAS_POR_TIPO: Record<string, { concepto: string; necesidad: 'Necesidades' | 'Deseos' | 'Ahorros' }[]> = {
  Ingreso: [
    { concepto: "Sueldo Principal", necesidad: "Necesidades" },
    { concepto: "Ingreso Freelance / Honorarios", necesidad: "Necesidades" },
    { concepto: "Rendimientos / Dividendos", necesidad: "Ahorros" },
    { concepto: "Venta o Ingreso Extra", necesidad: "Deseos" },
  ],
  Factura: [
    { concepto: "Renta de Departamento", necesidad: "Necesidades" },
    { concepto: "Electricidad y Agua", necesidad: "Necesidades" },
    { concepto: "Internet Fibra Óptica", necesidad: "Necesidades" },
    { concepto: "Plan Móvil", necesidad: "Necesidades" },
    { concepto: "Seguro de Auto / Médico", necesidad: "Necesidades" },
  ],
  GastoVariable: [
    { concepto: "Supermercado y Despensa", necesidad: "Necesidades" },
    { concepto: "Gasolina y Transporte", necesidad: "Necesidades" },
    { concepto: "Restaurantes y Cenas", necesidad: "Deseos" },
    { concepto: "Cafés y Snacks", necesidad: "Deseos" },
    { concepto: "Cine y Entretenimiento", necesidad: "Deseos" },
    { concepto: "Ropa y Accesorios", necesidad: "Deseos" },
    { concepto: "Farmacia y Medicinas", necesidad: "Necesidades" },
  ],
  Ahorro: [
    { concepto: "Aportación Fondo de Emergencia", necesidad: "Ahorros" },
    { concepto: "Ahorro para Vacaciones", necesidad: "Ahorros" },
    { concepto: "Meta Compra de Auto / Casa", necesidad: "Ahorros" },
  ],
  Inversion: [
    { concepto: "Fondo Indexado S&P 500 / CETES", necesidad: "Ahorros" },
    { concepto: "Aportación Voluntaria Retiro", necesidad: "Ahorros" },
    { concepto: "Acciones / Cripto / FIBRAS", necesidad: "Ahorros" },
  ],
  Deuda: [
    { concepto: "Pago Mensual Tarjeta de Crédito", necesidad: "Necesidades" },
    { concepto: "Amortización Crédito Automotriz", necesidad: "Necesidades" },
    { concepto: "Préstamo Personal", necesidad: "Necesidades" },
  ]
};

export const DEFAULT_SETTINGS: AppSettings = {
  moneda: "MXN",
  simboloMoneda: "$",
  sheetsEndpoint: "/api",
  autoSync: false,
};

export const INITIAL_METAS: MetaAhorro[] = [];

export function getInitialMovements(): Movimiento[] {
  return [];
}

