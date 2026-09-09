import { Movimiento, GoogleDriveFile } from '../types';

export const SPREADSHEET_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
];

/**
 * Extracts a Google Spreadsheet ID from either a full URL or a raw ID string.
 */
export function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  // Matching /spreadsheets/d/([a-zA-Z0-9-_]+)
  const matchSheets = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (matchSheets && matchSheets[1]) return matchSheets[1];

  // Matching /file/d/([a-zA-Z0-9-_]+)
  const matchDrive = trimmed.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
  if (matchDrive && matchDrive[1]) return matchDrive[1];

  // Matching id=([a-zA-Z0-9-_]+)
  const matchQuery = trimmed.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (matchQuery && matchQuery[1]) return matchQuery[1];

  // If it's a bare ID (alphanumeric and hyphens/underscores, usually > 20 chars)
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed;
}

/**
 * Lists spreadsheets from the user's Google Drive.
 */
export async function listDriveSpreadsheets(token: string): Promise<GoogleDriveFile[]> {
  const query = encodeURIComponent(
    "(mimeType='application/vnd.google-apps.spreadsheet' or mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or name contains 'Presupuesto' or name contains 'Finanzas') and trashed=false"
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

  // Sort with priority to Presupuesto_Mensual_50_30_20
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
 * Specifically locates "Presupuesto_Mensual_50_30_20.xlsx" or any variations in Google Drive.
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

  // Look for exact match or closest match
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

/**
 * Prepares an Excel .xlsx file or Google Spreadsheet in Drive for real-time sync.
 * If the file is a raw Excel binary, it safely creates/converts a Google Spreadsheet copy
 * in Drive so the Google Sheets API can perform real-time appends and reads.
 */
export async function prepareSpreadsheetForRealtimeSync(
  token: string,
  file: GoogleDriveFile
): Promise<{
  id: string;
  title: string;
  webViewLink?: string;
  convertedFromExcel: boolean;
}> {
  // If already native Google Spreadsheet
  if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
    return {
      id: file.id,
      title: file.name,
      webViewLink: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
      convertedFromExcel: false,
    };
  }

  // Check if Google Sheets API can read this file directly
  try {
    const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/${file.id}?fields=spreadsheetId,properties.title`;
    const testRes = await fetch(testUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (testRes.ok) {
      const testData = await testRes.json();
      return {
        id: file.id,
        title: testData.properties?.title || file.name,
        webViewLink: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
        convertedFromExcel: false,
      };
    }
  } catch (err) {
    // If not readable directly, proceed with conversion
  }

  // Convert/copy .xlsx file into a Google Spreadsheet in the user's Drive
  const copyUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/copy`;
  const res = await fetch(copyUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: file.name.replace(/\.xlsx$/i, '') + ' (Google Sheets)',
      mimeType: 'application/vnd.google-apps.spreadsheet',
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message ||
        'El archivo Excel .xlsx no pudo ser transformado a Google Sheets para sincronización en vivo. Por favor ábrelo con Google Sheets en tu Drive una vez.'
    );
  }

  const converted = await res.json();
  return {
    id: converted.id,
    title: converted.name || file.name,
    webViewLink: `https://docs.google.com/spreadsheets/d/${converted.id}/edit`,
    convertedFromExcel: true,
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
 * Gets details of a specific spreadsheet (tabs, title).
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
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: 'Movimientos',
          gridProperties: {
            frozenRowCount: 1,
          },
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

  // Initialize header row in Movimientos
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
 * Ensures that the target spreadsheet has a valid 'Movimientos' or active tab with headers.
 */
export async function ensureMovimientosHeader(
  token: string,
  spreadsheetId: string,
  sheetName: string
): Promise<void> {
  // Check if header row exists
  const checkUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    sheetName
  )}!A1:H1`;
  const res = await fetch(checkUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.ok) {
    const data = await res.json();
    if (data.values && data.values.length > 0 && data.values[0].length > 0) {
      // Already has headers
      return;
    }
  }

  // Set default headers
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

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function normalizeMonth(rawMes: string, rawFecha: string): string {
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
 * Reads movements from Google Sheets.
 * Handles both the template format (headers at row 4, data starting row 5)
 * and the standard format (headers at row 1, data starting row 2).
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
  if (rows.length === 0) return [];

  // Determine starting row:
  // Check if row 4 is a header like in Code.gs ("Fecha", "Mes", "Tipo", "Concepto", etc.)
  let startIndex = 1;
  if (rows.length >= 5) {
    const row4Text = rows[3] ? rows[3].join(' ').toLowerCase() : '';
    if (row4Text.includes('fecha') || row4Text.includes('concepto') || row4Text.includes('monto')) {
      startIndex = 4; // Start data at index 4 (row 5)
    }
  }

  const parsedMovements: Movimiento[] = [];

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    // Minimum check: concept or amount exists
    const rawConcepto = row[3] || row[2] || '';
    const rawMonto = row[5] !== undefined ? row[5] : (row[4] !== undefined ? row[4] : 0);
    if (!rawConcepto && !rawMonto) continue;

    const fecha = String(row[0] || '').trim();
    const mes = String(row[1] || '').trim();
    const tipo = (String(row[2] || 'GastoVariable').trim()) as Movimiento['tipo'];
    const concepto = String(row[3] || 'Movimiento sin nombre').trim();
    const necesidad = (String(row[4] || '').trim()) as Movimiento['necesidad'];
    
    // Clean monto: strip currency signs, commas if string
    let monto = 0;
    if (typeof rawMonto === 'number') {
      monto = rawMonto;
    } else {
      const cleanStr = String(rawMonto).replace(/[^0-9.-]+/g, '');
      monto = parseFloat(cleanStr) || 0;
    }

    const notas = row[6] ? String(row[6]) : '';
    const id = row[7] ? String(row[7]) : `sheet-row-${i}-${Date.now()}`;

    parsedMovements.push({
      id,
      fecha: fecha || new Date().toISOString().slice(0, 10),
      mes: normalizeMonth(mes, fecha),
      tipo: (['Ingreso', 'Factura', 'GastoVariable', 'Ahorro', 'Inversion', 'Deuda'].includes(tipo)
        ? tipo
        : 'GastoVariable') as Movimiento['tipo'],
      concepto: concepto || 'Sin concepto',
      necesidad: (['Necesidades', 'Deseos', 'Ahorros'].includes(necesidad)
        ? necesidad
        : '') as Movimiento['necesidad'],
      monto,
      notas,
    });
  }

  return parsedMovements;
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
  // Clear existing data rows starting from row 2
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

  // Write header
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
