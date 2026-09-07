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
  const mesMovimientos = movimientos.filter((m) => m.mes === mes);

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
