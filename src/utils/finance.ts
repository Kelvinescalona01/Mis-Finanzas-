import { Movimiento, ResumenMes } from '../types';

export function formatCurrency(amount: number, symbol: string = '$'): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${isNegative ? '-' : ''}${symbol}${formatted}`;
}

export function calculateResumen(movimientos: Movimiento[], mes: string): ResumenMes {
  const targetMes = (mes || '').trim().toLowerCase();
  const mesMovimientos = movimientos.filter(
    (m) => (m.mes || '').trim().toLowerCase() === targetMes
  );

  let ingreso = 0;
  let facturas = 0;
  let gastos = 0;
  let ahorros = 0;
  let inversion = 0;
  let deuda = 0;

  let necesidadesMonto = 0;
  let deseosMonto = 0;
  let ahorrosReglaMonto = 0;

  for (const m of mesMovimientos) {
    const val = Number(m.monto) || 0;
    switch (m.tipo) {
      case 'Ingreso':
        ingreso += val;
        break;
      case 'Factura':
        facturas += val;
        break;
      case 'GastoVariable':
        gastos += val;
        break;
      case 'Ahorro':
        ahorros += val;
        break;
      case 'Inversion':
        inversion += val;
        break;
      case 'Deuda':
        deuda += val;
        break;
    }

    // Regla 50/30/20 assignment
    if (m.tipo !== 'Ingreso') {
      if (m.necesidad === 'Necesidades') {
        necesidadesMonto += val;
      } else if (m.necesidad === 'Deseos') {
        deseosMonto += val;
      } else if (m.necesidad === 'Ahorros' || m.tipo === 'Ahorro' || m.tipo === 'Inversion') {
        ahorrosReglaMonto += val;
      } else {
        // Fallback based on type
        if (m.tipo === 'Factura' || m.tipo === 'Deuda') {
          necesidadesMonto += val;
        } else if (m.tipo === 'GastoVariable') {
          deseosMonto += val;
        }
      }
    }
  }

  const totalGastado = facturas + gastos + deuda;
  const totalAhorrado = ahorros + inversion;
  const restante = ingreso - (totalGastado + totalAhorrado);

  const baseIngreso = Math.max(ingreso, 1);
  const necesidadesTarget = ingreso * 0.50;
  const deseosTarget = ingreso * 0.30;
  const ahorrosTarget = ingreso * 0.20;

  return {
    mes,
    ingresoTotal: ingreso,
    totalGastado,
    totalAhorrado,
    restante,
    actual: {
      ingreso,
      gastos,
      facturas,
      ahorros,
      inversion,
      deuda,
    },
    regla503020: {
      necesidadesMonto,
      necesidadesPct: Math.round((necesidadesMonto / baseIngreso) * 100),
      necesidadesTarget,
      deseosMonto,
      deseosPct: Math.round((deseosMonto / baseIngreso) * 100),
      deseosTarget,
      ahorrosMonto: ahorrosReglaMonto,
      ahorrosPct: Math.round((ahorrosReglaMonto / baseIngreso) * 100),
      ahorrosTarget,
    },
  };
}

export function exportToCSV(movimientos: Movimiento[]): string {
  const headers = ['ID', 'Fecha', 'Mes', 'Tipo', 'Concepto', 'Regla 50/30/20', 'Monto', 'Notas'];
  const rows = movimientos.map((m) => [
    `"${m.id}"`,
    `"${m.fecha}"`,
    `"${m.mes}"`,
    `"${m.tipo}"`,
    `"${m.concepto.replace(/"/g, '""')}"`,
    `"${m.necesidad || ''}"`,
    m.monto,
    `"${(m.notas || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function downloadCSV(movimientos: Movimiento[], filename: string = 'mis-finanzas.csv') {
  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(exportToCSV(movimientos));
  const link = document.createElement('a');
  link.setAttribute('href', csvContent);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export interface MesBarData {
  mes: string;
  mesCorto: string;
  ingresos: number;
  gastos: number;
  ahorros: number;
  balance: number;
}

export function calculateAnnualOverview(movimientos: Movimiento[]): MesBarData[] {
  const MESES_LIST = [
    { nombre: 'Enero', corto: 'Ene' },
    { nombre: 'Febrero', corto: 'Feb' },
    { nombre: 'Marzo', corto: 'Mar' },
    { nombre: 'Abril', corto: 'Abr' },
    { nombre: 'Mayo', corto: 'May' },
    { nombre: 'Junio', corto: 'Jun' },
    { nombre: 'Julio', corto: 'Jul' },
    { nombre: 'Agosto', corto: 'Ago' },
    { nombre: 'Septiembre', corto: 'Sep' },
    { nombre: 'Octubre', corto: 'Oct' },
    { nombre: 'Noviembre', corto: 'Nov' },
    { nombre: 'Diciembre', corto: 'Dic' },
  ];

  return MESES_LIST.map(({ nombre, corto }) => {
    const targetName = nombre.toLowerCase();
    const list = movimientos.filter(
      (m) => (m.mes || '').trim().toLowerCase() === targetName
    );
    let ingresos = 0;
    let gastos = 0;
    let ahorros = 0;

    for (const m of list) {
      const val = Number(m.monto) || 0;
      if (m.tipo === 'Ingreso') {
        ingresos += val;
      } else if (m.tipo === 'Ahorro' || m.tipo === 'Inversion' || m.necesidad === 'Ahorros') {
        ahorros += val;
      } else {
        gastos += val;
      }
    }

    return {
      mes: nombre,
      mesCorto: corto,
      ingresos,
      gastos,
      ahorros,
      balance: ingresos - (gastos + ahorros),
    };
  });
}

export interface CategoryItem {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

export function calculateCategoryBreakdown(movimientos: Movimiento[], mes: string): CategoryItem[] {
  const targetMes = (mes || '').trim().toLowerCase();
  const filtered = movimientos.filter(
    (m) => (m.mes || '').trim().toLowerCase() === targetMes && m.tipo !== 'Ingreso'
  );

  const map: Record<string, number> = {};
  let total = 0;

  for (const m of filtered) {
    const cat = m.categoriaDetalle || m.concepto || 'Varios';
    const val = Number(m.monto) || 0;
    map[cat] = (map[cat] || 0) + val;
    total += val;
  }

  const COLORS = [
    '#3E7C6B',
    '#C9A227',
    '#A6483B',
    '#2563EB',
    '#7C3AED',
    '#DB2777',
    '#059669',
    '#D97706',
    '#4F46E5',
    '#64748B',
  ];

  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length],
      percentage: total > 0 ? Math.round((value / total) * 100) : 0,
    }));
}

export interface FinancialKPIs {
  tasaAhorro: number;
  gastoDiario: number;
  proyeccionFinMes: number;
  diasCobertura: number;
  diasTranscurridos: number;
  diasTotalesMes: number;
}

export function calculateFinancialKPIs(
  movimientos: Movimiento[],
  mes: string,
  ingresoTotal: number,
  totalGastado: number,
  totalAhorrado: number
): FinancialKPIs {
  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const diasTotalesMes = new Date(now.getFullYear(), currentMonthIdx + 1, 0).getDate();
  const diasTranscurridos = Math.max(1, Math.min(now.getDate(), diasTotalesMes));

  const tasaAhorro = ingresoTotal > 0 ? Math.round((totalAhorrado / ingresoTotal) * 100) : 0;
  const gastoDiario = Math.round((totalGastado / diasTranscurridos) * 100) / 100;
  const gastoProyectado = gastoDiario * diasTotalesMes;
  const proyeccionFinMes = Math.round((ingresoTotal - gastoProyectado - totalAhorrado) * 100) / 100;

  // Days of coverage (total accumulated savings / average daily expense)
  const allSavings = movimientos
    .filter((m) => m.tipo === 'Ahorro' || m.tipo === 'Inversion' || m.necesidad === 'Ahorros')
    .reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0);
  
  const diasCobertura = gastoDiario > 0 ? Math.round(allSavings / gastoDiario) : 0;

  return {
    tasaAhorro,
    gastoDiario,
    proyeccionFinMes,
    diasCobertura,
    diasTranscurridos,
    diasTotalesMes,
  };
}
