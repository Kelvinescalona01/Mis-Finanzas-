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

export const INITIAL_METAS: MetaAhorro[] = [
  {
    id: "meta-1",
    nombre: "Fondo de Emergencia (6 meses)",
    objetivo: 60000,
    acumulado: 34500,
    color: "#3E7C6B",
    fechaLimite: "2026-12-31"
  },
  {
    id: "meta-2",
    nombre: "Vacaciones de Fin de Año",
    objetivo: 18000,
    acumulado: 12400,
    color: "#C9A227",
    fechaLimite: "2026-11-20"
  },
  {
    id: "meta-3",
    nombre: "Inversión Portafolio ETF",
    objetivo: 40000,
    acumulado: 22000,
    color: "#16241E",
    fechaLimite: "2027-03-01"
  }
];

export function getInitialMovements(): Movimiento[] {
  const d = new Date();
  const currentYear = d.getFullYear();
  const currentMonthIdx = d.getMonth();
  const currentMonthName = MESES[currentMonthIdx];
  const pad = (n: number) => String(n).padStart(2, '0');
  
  const todayStr = `${currentYear}-${pad(currentMonthIdx + 1)}-${pad(Math.min(d.getDate(), 28))}`;
  const dayStr = (day: number) => `${currentYear}-${pad(currentMonthIdx + 1)}-${pad(day)}`;

  return [
    {
      id: "mov-1",
      fecha: dayStr(1),
      mes: currentMonthName,
      tipo: "Ingreso",
      concepto: "Sueldo Quincenal (1ra Quincena)",
      necesidad: "Necesidades",
      monto: 16000,
      notas: "Nómina depósito directo"
    },
    {
      id: "mov-2",
      fecha: dayStr(15),
      mes: currentMonthName,
      tipo: "Ingreso",
      concepto: "Sueldo Quincenal (2da Quincena)",
      necesidad: "Necesidades",
      monto: 16000,
      notas: "Nómina depósito directo"
    },
    {
      id: "mov-3",
      fecha: dayStr(2),
      mes: currentMonthName,
      tipo: "Factura",
      concepto: "Renta de Departamento",
      necesidad: "Necesidades",
      monto: 8500,
      notas: "Transferencia a arrendador"
    },
    {
      id: "mov-4",
      fecha: dayStr(3),
      mes: currentMonthName,
      tipo: "Factura",
      concepto: "Luz (CFE) e Internet Fibra",
      necesidad: "Necesidades",
      monto: 1450
    },
    {
      id: "mov-5",
      fecha: dayStr(4),
      mes: currentMonthName,
      tipo: "GastoVariable",
      concepto: "Despensa Mensual y Frutas",
      necesidad: "Necesidades",
      monto: 4800,
      notas: "Mercado principal"
    },
    {
      id: "mov-6",
      fecha: dayStr(5),
      mes: currentMonthName,
      tipo: "Ahorro",
      concepto: "Fondo de Emergencia",
      necesidad: "Ahorros",
      monto: 3500
    },
    {
      id: "mov-7",
      fecha: dayStr(6),
      mes: currentMonthName,
      tipo: "Inversion",
      concepto: "Aportación ETF S&P 500",
      necesidad: "Ahorros",
      monto: 2900
    },
    {
      id: "mov-8",
      fecha: dayStr(7),
      mes: currentMonthName,
      tipo: "GastoVariable",
      concepto: "Cena Restaurante con Amigos",
      necesidad: "Deseos",
      monto: 1850
    },
    {
      id: "mov-9",
      fecha: dayStr(8),
      mes: currentMonthName,
      tipo: "GastoVariable",
      concepto: "Suscripción Netflix y Spotify",
      necesidad: "Deseos",
      monto: 420
    },
    {
      id: "mov-10",
      fecha: dayStr(10),
      mes: currentMonthName,
      tipo: "Deuda",
      concepto: "Pago Tarjeta de Crédito (Mes Anterior)",
      necesidad: "Necesidades",
      monto: 1600
    },
    {
      id: "mov-11",
      fecha: dayStr(12),
      mes: currentMonthName,
      tipo: "GastoVariable",
      concepto: "Gasolina y Tag Peaje",
      necesidad: "Necesidades",
      monto: 1200
    },
    {
      id: "mov-12",
      fecha: dayStr(14),
      mes: currentMonthName,
      tipo: "GastoVariable",
      concepto: "Ropa deportiva y calzado",
      necesidad: "Deseos",
      monto: 1350
    }
  ];
}
