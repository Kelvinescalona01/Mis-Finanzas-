export type TipoMovimiento = 
  | 'Ingreso' 
  | 'Factura' 
  | 'GastoVariable' 
  | 'Ahorro' 
  | 'Inversion' 
  | 'Deuda';

export type CategoriaRegla = 'Necesidades' | 'Deseos' | 'Ahorros' | '';

export interface Movimiento {
  id: string;
  fecha: string; // YYYY-MM-DD for standard handling
  mes: string;   // e.g. "Septiembre"
  tipo: TipoMovimiento;
  concepto: string;
  categoriaDetalle?: string;
  necesidad: CategoriaRegla;
  monto: number;
  notas?: string;
}

export interface MetaAhorro {
  id: string;
  nombre: string;
  objetivo: number;
  acumulado: number;
  color: string;
  fechaLimite?: string;
}

export interface LimiteCategoria {
  categoria: string;
  limite: number;
}

export interface ResumenMes {
  mes: string;
  ingresoTotal: number;
  totalGastado: number;
  totalAhorrado: number;
  restante: number;
  actual: {
    ingreso: number;
    gastos: number;
    facturas: number;
    ahorros: number;
    inversion: number;
    deuda: number;
  };
  regla503020: {
    necesidadesMonto: number;
    necesidadesPct: number;
    necesidadesTarget: number;
    deseosMonto: number;
    deseosPct: number;
    deseosTarget: number;
    ahorrosMonto: number;
    ahorrosPct: number;
    ahorrosTarget: number;
  };
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface AppSettings {
  moneda: string;
  simboloMoneda: string;
  sheetsEndpoint: string;
  autoSync: boolean;
  googleSheetId?: string;
  googleSheetName?: string;
  googleSpreadsheetTitle?: string;
  googleDriveWebViewLink?: string;
  fileMimeType?: string;
  lastSyncedAt?: string;
}
