import * as XLSX from 'xlsx';
import { Movimiento, GoogleDriveFile } from '../types';

export const SPREADSHEET_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
];

/**
 * Checks whether a given file, MIME type, or filename is Microsoft Excel (.xlsx / .xls)
 */
export function isExcelFile(fileOrMime: { mimeType?: string; name?: string } | string): boolean {
  if (typeof fileOrMime === 'string') {
    const lower = fileOrMime.toLowerCase();
    return (
      lower.includes('spreadsheetml') ||
      lower.includes('wps-office.xlsx') ||
      lower.endsWith('.xlsx') ||
      lower.endsWith('.xls')
    );
  }
  const mime = (fileOrMime.mimeType || '').toLowerCase();
  const name = (fileOrMime.name || '').toLowerCase();
  return (
    mime.includes('spreadsheetml') ||
    mime.includes('wps-office.xlsx') ||
    name.endsWith('.xlsx') ||
    name.endsWith('.xls')
  );
}

/**
 * Extracts a Google Spreadsheet ID from either a full URL or a raw ID string.
 */
export function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  const matchSheets = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (matchSheets && matchSheets[1]) return matchSheets[1];

  const matchDrive = trimmed.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
  if (matchDrive && matchDrive[1]) return matchDrive[1];

  const matchQuery = trimmed.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (matchQuery && matchQuery[1]) return matchQuery[1];

  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed;
}

/**
 * Lists spreadsheets and Excel files from the user's Google Drive.
 */
export async function listDriveSpreadsheets(token: string): Promise<GoogleDriveFile[]> {
  const query = encodeURIComponent(
    "(mimeType='application/vnd.google-apps.spreadsheet' or mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or name contains 'Presupuesto' or name contains 'Finanzas' or name contains '.xlsx') and trashed=false"
  );
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=30`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Error de Google Drive (HTTP ${res.status})`);
  }

  const data = await res.json();
  const files: GoogleDriveFile[] = data.files || [];

  files.sort((a, b) => {
    const aMatch = a.name.toLowerCase().includes('presupuesto_mensual_50_30_20');
    const bMatch = b.name.toLowerCase().includes('presupuesto_mensual_50_30_20');
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });

  return files;
}

/**
 * Specifically locates "Presupuesto_Mensual_50_30_20.xlsx" or variations in Google Drive.
 */
export async function searchPresupuestoFileInDrive(token: string): Promise<{
  targetFile: GoogleDriveFile | null;
  allMatches: GoogleDriveFile[];
}> {
  const query = encodeURIComponent(
    "(name contains 'Presupuesto_Mensual_50_30_20' or name contains 'Presupuesto_Mensual' or name contains '50_30_20' or name contains 'Presupuesto') and trashed=false"
  );
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=25`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Error al buscar en Google Drive (HTTP ${res.status})`);
  }

  const data = await res.json();
  const files: GoogleDriveFile[] = data.files || [];

  const exactMatch = files.find(
    (f) =>
      f.name.toLowerCase().trim() === 'presupuesto_mensual_50_30_20.xlsx' ||
      f.name.toLowerCase().trim() === 'presupuesto_mensual_50_30_20'
  );

  const containsMatch = files.find((f) =>
    f.name.toLowerCase().includes('presupuesto_mensual_50_30_20')
  );

  return {
    targetFile: exactMatch || containsMatch || files[0] || null,
    allMatches: files,
  };
}

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function normalizeMonth(rawMes: string, rawFecha: string): string {
  const clean = String(rawMes || '').trim().toLowerCase();
  const map: Record<string, string> = {
    ene: 'Enero', enero: 'Enero', '1': 'Enero', '01': 'Enero',
    feb: 'Febrero', febrero: 'Febrero', '2': 'Febrero', '02': 'Febrero',
    mar: 'Marzo', marzo: 'Marzo', '3': 'Marzo', '03': 'Marzo',
    abr: 'Abril', abril: 'Abril', '4': 'Abril', '04': 'Abril',
    may: 'Mayo', mayo: 'Mayo', '5': 'Mayo', '05': 'Mayo',
    jun: 'Junio', junio: 'Junio', '6': 'Junio', '06': 'Junio',
    jul: 'Julio', julio: 'Julio', '7': 'Julio', '07': 'Julio',
    ago: 'Agosto', agosto: 'Agosto', '8': 'Agosto', '08': 'Agosto',
    sep: 'Septiembre', set: 'Septiembre', septiembre: 'Septiembre', '9': 'Septiembre', '09': 'Septiembre',
    oct: 'Octubre', octubre: 'Octubre', '10': 'Octubre',
    nov: 'Noviembre', noviembre: 'Noviembre', '11': 'Noviembre',
    dic: 'Diciembre', diciembre: 'Diciembre', '12': 'Diciembre',
  };

  if (map[clean]) return map[clean];

  if (rawFecha) {
    const isoMatch = rawFecha.match(/^\d{4}[-/](\d{1,2})[-/]\d{1,2}/);
    if (isoMatch) {
      const idx = parseInt(isoMatch[1], 10) - 1;
      if (idx >= 0 && idx < 12) return MONTH_NAMES[idx];
    }
    const latMatch = rawFecha.match(/^\d{1,2}[-/](\d{1,2})[-/]\d{2,4}/);
    if (latMatch) {
      const idx = parseInt(latMatch[1], 10) - 1;
      if (idx >= 0 && idx < 12) return MONTH_NAMES[idx];
    }
  }

  return 'Enero';
}

/**
 * Parses raw 2D array of spreadsheet/Excel rows into Movimiento items.
 * Intelligently detects header columns and row offsets.
 */
export function parseRawRowsToMovements(rows: any[][]): Movimiento[] {
  if (!rows || rows.length === 0) return [];

  let headerIndex = -1;
  let dateCol = 0;
  let monthCol = 1;
  let typeCol = 2;
  let conceptCol = 3;
  let needCol = 4;
  let amountCol = 5;
  let notesCol = 6;
  let idCol = 7;

  // Search first 12 rows for header keywords
  for (let r = 0; r < Math.min(rows.length, 12); r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    const rowStr = row.map((cell) => String(cell || '').toLowerCase()).join(' ');
    if (
      (rowStr.includes('fecha') || rowStr.includes('date')) &&
      (rowStr.includes('monto') || rowStr.includes('amount') || rowStr.includes('importe') || rowStr.includes('concepto'))
    ) {
      headerIndex = r;
      row.forEach((cell, idx) => {
        const c = String(cell || '').toLowerCase().trim();
        if (c.includes('fecha') || c.includes('date')) dateCol = idx;
        else if (c.includes('mes') || c === 'month') monthCol = idx;
        else if (c.includes('tipo') || c === 'type') typeCol = idx;
        else if (c.includes('concepto') || c.includes('descrip') || c.includes('nombre') || c.includes('detalle')) conceptCol = idx;
        else if (c.includes('categor') || c.includes('regla') || c.includes('necesidad')) needCol = idx;
        else if (c.includes('monto') || c.includes('amount') || c.includes('importe') || c.includes('precio') || c.includes('costo')) amountCol = idx;
        else if (c.includes('nota') || c.includes('coment')) notesCol = idx;
        else if (c.includes('id') || c.includes('registro')) idCol = idx;
      });
      break;
    }
  }

  const startIdx = headerIndex >= 0 ? headerIndex + 1 : 1;
  const parsedMovements: Movimiento[] = [];

  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row) || row.length === 0) continue;

    const rawConcepto = row[conceptCol] !== undefined ? row[conceptCol] : (row[typeCol] || '');
    const rawMonto = row[amountCol] !== undefined ? row[amountCol] : (row[needCol] !== undefined ? row[needCol] : undefined);
    if (!rawConcepto && (rawMonto === undefined || rawMonto === '' || rawMonto === null)) continue;

    // Date normalization
    let rawFecha = row[dateCol];
    let fecha = '';
    if (rawFecha instanceof Date) {
      const pad = (n: number) => String(n).padStart(2, '0');
      fecha = `${rawFecha.getFullYear()}-${pad(rawFecha.getMonth() + 1)}-${pad(rawFecha.getDate())}`;
    } else if (typeof rawFecha === 'number') {
      const dateObj = new Date(Math.round((rawFecha - 25569) * 86400 * 1000));
      if (!isNaN(dateObj.getTime())) {
        const pad = (n: number) => String(n).padStart(2, '0');
        fecha = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
      }
    } else {
      fecha = String(rawFecha || '').trim();
    }

    const mes = String(row[monthCol] || '').trim();
    const rawTipo = String(row[typeCol] || '').trim();
    const concepto = String(rawConcepto || 'Movimiento').trim();
    const rawNecesidad = String(row[needCol] || '').trim();

    let monto = 0;
    if (typeof rawMonto === 'number') {
      monto = rawMonto;
    } else {
      const cleanStr = String(rawMonto || '0').replace(/[^0-9.-]+/g, '');
      monto = parseFloat(cleanStr) || 0;
    }

    if (monto === 0 && (!concepto || concepto.toLowerCase() === 'total' || concepto.toLowerCase().includes('resumen'))) {
      continue;
    }

    let tipo: Movimiento['tipo'] = 'GastoVariable';
    const tipoLower = rawTipo.toLowerCase();
    if (tipoLower.includes('ingreso') || tipoLower.includes('income')) tipo = 'Ingreso';
    else if (tipoLower.includes('factura') || tipoLower.includes('fijo') || tipoLower.includes('bill')) tipo = 'Factura';
    else if (tipoLower.includes('ahorro') || tipoLower.includes('saving')) tipo = 'Ahorro';
    else if (tipoLower.includes('invers') || tipoLower.includes('invest')) tipo = 'Inversion';
    else if (tipoLower.includes('deud') || tipoLower.includes('debt')) tipo = 'Deuda';
    else if (tipoLower.includes('variable')) tipo = 'GastoVariable';

    let necesidad: Movimiento['necesidad'] = '';
    const necLower = rawNecesidad.toLowerCase();
    if (necLower.includes('necesidad') || necLower.includes('50')) necesidad = 'Necesidades';
    else if (necLower.includes('deseo') || necLower.includes('30')) necesidad = 'Deseos';
    else if (necLower.includes('ahorro') || necLower.includes('inver') || necLower.includes('20')) necesidad = 'Ahorros';
    else if (tipo === 'Factura') necesidad = 'Necesidades';
    else if (tipo === 'GastoVariable') necesidad = 'Deseos';
    else if (tipo === 'Ahorro' || tipo === 'Inversion') necesidad = 'Ahorros';

    const notas = row[notesCol] ? String(row[notesCol]) : '';
    const id = row[idCol] ? String(row[idCol]) : `excel-row-${i}-${Date.now()}`;

    parsedMovements.push({
      id,
      fecha: fecha || new Date().toISOString().slice(0, 10),
      mes: normalizeMonth(mes, fecha),
      tipo,
      concepto,
      necesidad,
      monto,
      notas,
    });
  }

  return parsedMovements;
}

/**
 * Parses all sheets of an XLSX workbook into Movimiento items.
 */
export function parseWorkbookToMovements(workbook: XLSX.WorkBook): Movimiento[] {
  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) return [];

  // 1. Look for a dedicated 'Movimientos' or 'Gastos' or 'Transacciones' sheet
  const movSheetName = sheetNames.find((n) => {
    const l = n.toLowerCase().trim();
    return l === 'movimientos' || l === 'transacciones' || l === 'gastos' || l === 'datos';
  });

  if (movSheetName && workbook.Sheets[movSheetName]) {
    const rows = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets[movSheetName], { header: 1, defval: '' });
    const movs = parseRawRowsToMovements(rows);
    if (movs.length > 0) return movs;
  }

  // 2. Check for month sheets (ENE, FEB, MAR, ...)
  const monthAbbrs = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const monthSheets = sheetNames.filter((n) => monthAbbrs.includes(n.toLowerCase().trim().slice(0, 3)));

  if (monthSheets.length > 0) {
    const allMonthMovs: Movimiento[] = [];
    for (const sName of monthSheets) {
      const sheet = workbook.Sheets[sName];
      if (!sheet) continue;
      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
      const movs = parseRawRowsToMovements(rows);
      allMonthMovs.push(...movs);
    }
    if (allMonthMovs.length > 0) return allMonthMovs;
  }

  // 3. Fallback to first sheet
  const firstSheet = workbook.Sheets[sheetNames[0]];
  if (firstSheet) {
    const rows = XLSX.utils.sheet_to_json<any[]>(firstSheet, { header: 1, defval: '' });
    return parseRawRowsToMovements(rows);
  }

  return [];
}

/**
 * Reads an Excel (.xlsx / .xls) binary file directly from Google Drive using Drive API alt=media.
 */
export async function readExcelBinaryFromDrive(token: string, fileId: string): Promise<Movimiento[]> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Error al descargar Excel de Drive (HTTP ${res.status})`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  return parseWorkbookToMovements(workbook);
}

/**
 * Writes/replaces an Excel (.xlsx) file directly in Google Drive using Drive API media upload.
 */
export async function writeExcelBinaryToDrive(
  token: string,
  fileId: string,
  movements: Movimiento[]
): Promise<{ ok: boolean; count: number }> {
  const wb = XLSX.utils.book_new();

  const headers = ['Fecha', 'Mes', 'Tipo', 'Concepto', 'Categoría / Regla', 'Monto', 'Notas', 'ID_Registro'];
  const rows = movements.map((m) => [
    m.fecha,
    m.mes,
    m.tipo,
    m.concepto,
    m.necesidad || '',
    m.monto,
    m.notas || '',
    m.id,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');

  const arrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

  const updateRes = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
      body: new Uint8Array(arrayBuffer),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Error al actualizar Excel en Drive (HTTP ${updateRes.status})`);
  }

  return { ok: true, count: movements.length };
}

/**
 * Converts a raw Excel file in Google Drive into a native, interactive Google Spreadsheet.
 */
export async function convertDriveExcelToGoogleSpreadsheet(
  token: string,
  excelFileId: string,
  originalName: string
): Promise<{ id: string; title: string; webViewLink: string }> {
  // Download binary from Drive
  const dlRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${excelFileId}?alt=media`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!dlRes.ok) {
    throw new Error(`Error al leer archivo original de Drive (HTTP ${dlRes.status})`);
  }
  const arrayBuf = await dlRes.arrayBuffer();

  const metadata = {
    name: originalName.replace(/\.xlsx$/i, '') + ' (Google Sheets)',
    mimeType: 'application/vnd.google-apps.spreadsheet',
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metaPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
  const mediaHeader = `${delimiter}Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\nContent-Transfer-Encoding: base64\r\n\r\n`;

  let binary = '';
  const bytes = new Uint8Array(arrayBuf);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64Data = btoa(binary);

  const multipartRequestBody = metaPart + mediaHeader + base64Data + closeDelimiter;

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Error al convertir Excel a Google Sheets');
  }

  const created = await uploadRes.json();
  return {
    id: created.id,
    title: created.name || metadata.name,
    webViewLink: `https://docs.google.com/spreadsheets/d/${created.id}/edit`,
  };
}

/**
 * Prepares an Excel or Google Spreadsheet in Drive for synchronization.
 */
export async function prepareSpreadsheetForRealtimeSync(
  token: string,
  file: GoogleDriveFile
): Promise<{
  id: string;
  title: string;
  webViewLink?: string;
  isExcel: boolean;
}> {
  if (isExcelFile(file)) {
    return {
      id: file.id,
      title: file.name,
      webViewLink: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
      isExcel: true,
    };
  }

  return {
    id: file.id,
    title: file.name,
    webViewLink: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
    isExcel: false,
  };
}

export interface SheetTabInfo {
  sheetId: number;
  title: string;
}

export interface SpreadsheetMetadata {
  id: string;
  title: string;
  sheets: SheetTabInfo[];
  webViewLink?: string;
}

/**
 * Gets details of a Google Spreadsheet (tabs, title).
 */
export async function getSpreadsheetDetails(
  token: string,
  spreadsheetId: string
): Promise<SpreadsheetMetadata> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets(properties(sheetId,title))`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Error al obtener hoja de cálculo (HTTP ${res.status})`);
  }

  const data = await res.json();
  const sheets: SheetTabInfo[] = (data.sheets || []).map((s: any) => ({
    sheetId: s.properties?.sheetId,
    title: s.properties?.title,
  }));

  return {
    id: data.spreadsheetId,
    title: data.properties?.title || 'Hoja de Finanzas',
    sheets,
    webViewLink: `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
  };
}

/**
 * Creates a brand new Google Spreadsheet in Google Drive with the 50/30/20 structure.
 */
export async function createDefaultSpreadsheet(
  token: string,
  title = 'Mis Finanzas 50/30/20'
): Promise<SpreadsheetMetadata> {
  const body = {
    properties: { title },
    sheets: [
      {
        properties: {
          title: 'Movimientos',
          gridProperties: { frozenRowCount: 1 },
        },
      },
      { properties: { title: 'ENE' } },
      { properties: { title: 'FEB' } },
      { properties: { title: 'MAR' } },
      { properties: { title: 'ABR' } },
      { properties: { title: 'MAY' } },
      { properties: { title: 'JUN' } },
      { properties: { title: 'JUL' } },
      { properties: { title: 'AGO' } },
      { properties: { title: 'SEP' } },
      { properties: { title: 'OCT' } },
      { properties: { title: 'NOV' } },
      { properties: { title: 'DIC' } },
    ],
  };

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Error al crear la hoja en Google Drive');
  }

  const created = await res.json();
  const spreadsheetId = created.spreadsheetId;

  const headers = [
    ['Fecha', 'Mes', 'Tipo', 'Concepto', 'Categoría / Regla', 'Monto', 'Notas', 'ID_Registro'],
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Movimientos!A1:H1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: headers }),
    }
  );

  return {
    id: spreadsheetId,
    title: created.properties?.title || title,
    sheets: (created.sheets || []).map((s: any) => ({
      sheetId: s.properties?.sheetId,
      title: s.properties?.title,
    })),
    webViewLink: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}

/**
 * Ensures that the target spreadsheet has a valid 'Movimientos' header row.
 */
export async function ensureMovimientosHeader(
  token: string,
  spreadsheetId: string,
  sheetName: string
): Promise<void> {
  const checkUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    sheetName
  )}!A1:H1`;
  const res = await fetch(checkUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.ok) {
    const data = await res.json();
    if (data.values && data.values.length > 0 && data.values[0].length > 0) {
      return;
    }
  }

  const headers = [
    ['Fecha', 'Mes', 'Tipo', 'Concepto', 'Categoría / Regla', 'Monto', 'Notas', 'ID_Registro'],
  ];
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      sheetName
    )}!A1:H1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: headers }),
    }
  );
}

/**
 * Appends a single movement to Google Sheets in real-time.
 */
export async function appendMovementToGoogleSheet(
  token: string,
  spreadsheetId: string,
  movimiento: Movimiento,
  sheetName = 'Movimientos'
): Promise<{ ok: boolean; updatedRange?: string }> {
  const row = [
    movimiento.fecha,
    movimiento.mes,
    movimiento.tipo,
    movimiento.concepto,
    movimiento.necesidad || '',
    movimiento.monto,
    movimiento.notas || '',
    movimiento.id,
  ];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    sheetName
  )}!A:H:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [row] }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Error al registrar en Google Sheets (HTTP ${res.status})`);
  }

  const data = await res.json();
  return { ok: true, updatedRange: data?.updates?.updatedRange };
}

/**
 * Reads movements from Google Sheets using Sheets API v4.
 */
export async function readMovementsFromGoogleSheet(
  token: string,
  spreadsheetId: string,
  sheetName = 'Movimientos'
): Promise<Movimiento[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    sheetName
  )}!A1:H1000`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Error al leer de Google Sheets (HTTP ${res.status})`);
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];
  return parseRawRowsToMovements(rows);
}

/**
 * Bulk writes/syncs all movements to Google Sheets.
 */
export async function syncAllMovementsToGoogleSheet(
  token: string,
  spreadsheetId: string,
  movements: Movimiento[],
  sheetName = 'Movimientos'
): Promise<{ ok: boolean; count: number }> {
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      sheetName
    )}!A2:H1000:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const headers = [
    ['Fecha', 'Mes', 'Tipo', 'Concepto', 'Categoría / Regla', 'Monto', 'Notas', 'ID_Registro'],
  ];
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      sheetName
    )}!A1:H1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: headers }),
    }
  );

  if (movements.length === 0) {
    return { ok: true, count: 0 };
  }

  const rows = movements.map((m) => [
    m.fecha,
    m.mes,
    m.tipo,
    m.concepto,
    m.necesidad || '',
    m.monto,
    m.notas || '',
    m.id,
  ]);

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      sheetName
    )}!A2:H${rows.length + 1}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: rows }),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Error al guardar datos en Google Sheets');
  }

  return { ok: true, count: movements.length };
}

/**
 * Universal reader: handles both native Google Sheets and binary Excel files (.xlsx).
 * Tries the appropriate method based on file format, with automatic fallback.
 */
export async function readAnySpreadsheet(
  token: string,
  fileId: string,
  fileMimeOrName?: string,
  sheetName = 'Movimientos'
): Promise<Movimiento[]> {
  const isExcel = isExcelFile(fileMimeOrName || '');

  if (isExcel) {
    try {
      return await readExcelBinaryFromDrive(token, fileId);
    } catch (excelErr) {
      console.warn('Direct Excel read failed, trying Sheets API:', excelErr);
      return await readMovementsFromGoogleSheet(token, fileId, sheetName);
    }
  }

  try {
    return await readMovementsFromGoogleSheet(token, fileId, sheetName);
  } catch (sheetsErr) {
    console.warn('Sheets API read failed, attempting binary Excel read:', sheetsErr);
    return await readExcelBinaryFromDrive(token, fileId);
  }
}

/**
 * Universal writer: handles both native Google Sheets and binary Excel files (.xlsx).
 */
export async function writeAnySpreadsheet(
  token: string,
  fileId: string,
  movements: Movimiento[],
  fileMimeOrName?: string,
  sheetName = 'Movimientos'
): Promise<{ ok: boolean; count: number; mode: 'sheets' | 'excel' }> {
  const isExcel = isExcelFile(fileMimeOrName || '');

  if (isExcel) {
    try {
      const res = await writeExcelBinaryToDrive(token, fileId, movements);
      return { ok: res.ok, count: res.count, mode: 'excel' };
    } catch (excelErr) {
      console.warn('Direct Excel write failed, attempting Sheets API write:', excelErr);
      const res = await syncAllMovementsToGoogleSheet(token, fileId, movements, sheetName);
      return { ok: res.ok, count: res.count, mode: 'sheets' };
    }
  }

  try {
    const res = await syncAllMovementsToGoogleSheet(token, fileId, movements, sheetName);
    return { ok: res.ok, count: res.count, mode: 'sheets' };
  } catch (sheetsErr) {
    console.warn('Sheets API write failed, attempting binary Excel write:', sheetsErr);
    const res = await writeExcelBinaryToDrive(token, fileId, movements);
    return { ok: res.ok, count: res.count, mode: 'excel' };
  }
}

/**
 * Merges two lists of movements without duplicates.
 * Matches records by id or by (fecha + normalized concepto + monto).
 */
export function mergeMovements(
  existingList: Movimiento[],
  incomingList: Movimiento[]
): {
  merged: Movimiento[];
  added: number;
} {
  const merged = [...existingList];
  let added = 0;

  for (const inc of incomingList) {
    const existsById = merged.some((m) => m.id === inc.id);
    if (existsById) continue;

    const existsByContent = merged.some(
      (m) =>
        m.fecha === inc.fecha &&
        m.monto === inc.monto &&
        m.concepto.trim().toLowerCase() === inc.concepto.trim().toLowerCase()
    );

    if (!existsByContent) {
      merged.push(inc);
      added++;
    }
  }

  // Sort descending by date
  merged.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  return { merged, added };
}

/**
 * Generates and triggers download of an Excel (.xlsx) file on the client computer.
 */
export function downloadMovementsAsExcel(
  movements: Movimiento[],
  filename = 'Presupuesto_Mensual_50_30_20.xlsx'
): void {
  const wb = XLSX.utils.book_new();

  const headers = ['Fecha', 'Mes', 'Tipo', 'Concepto', 'Categoría / Regla', 'Monto', 'Notas', 'ID_Registro'];
  const rows = movements.map((m) => [
    m.fecha,
    m.mes,
    m.tipo,
    m.concepto,
    m.necesidad || '',
    m.monto,
    m.notas || '',
    m.id,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');

  XLSX.writeFile(wb, filename);
}

/**
 * Parses a locally selected/dragged Excel (.xlsx) file from user's disk.
 */
export async function parseLocalExcelFile(file: File): Promise<Movimiento[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  return parseWorkbookToMovements(workbook);
}
