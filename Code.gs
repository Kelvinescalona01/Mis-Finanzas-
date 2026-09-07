/**
 * Code.gs — backend para "Mis Finanzas 50/30/20"
 *
 * Instalar:
 * 1. Abre tu hoja en Google Sheets.
 * 2. Extensiones > Apps Script.
 * 3. Borra el contenido de Code.gs y pega todo este archivo.
 * 4. Guarda (icono de disco).
 * 5. Implementar > Nueva implementacion > tipo "Aplicacion web".
 *    - Ejecutar como: Yo (tu cuenta)
 *    - Quien tiene acceso: Cualquier usuario
 * 6. Autoriza los permisos que pida Google.
 * 7. Copia la URL que termina en /exec y pegala en Ajustes de la app.
 *
 * Cada vez que edites este codigo debes crear una NUEVA implementacion
 * (o "Gestionar implementaciones" > editar > nueva version) para que
 * los cambios se reflejen en la URL ya publicada.
 */

var MOV_SHEET = "Movimientos";

// Filas fijas dentro de cada hoja mensual (identicas en los 12 meses).
var ROW = {
  MES_LABEL: "B6",
  INGRESO_TOTAL: "A10",
  PRESUPUESTO_ASIGNAR: "A12",
  TOTAL_GASTADO: "A15",
  TOTAL_AHORRADO: "A17",
  PLAN_NECESIDADES: "C32", PLAN_NECESIDADES_PCT: "B32",
  PLAN_DESEOS: "C33", PLAN_DESEOS_PCT: "B33",
  PLAN_AHORROS: "C34", PLAN_AHORROS_PCT: "B34",
  ACT_INGRESO: "C39",
  ACT_GASTOS: "C40",
  ACT_FACTURAS: "C41",
  ACT_AHORROS: "C42",
  ACT_INVERSION: "C43",
  ACT_DEUDA: "C44",
  ACT_RESTANTE: "C45",
};

function sheetCodeForMes(mes) {
  return mes.substring(0, 3).toUpperCase(); // "Abril" -> "ABR"
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
      .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    var action = e.parameter.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (action === "resumen") return jsonOut(getResumen(ss, e.parameter.mes));
    if (action === "historial") return jsonOut(getHistorial(ss, e.parameter.mes, e.parameter.limit));
    return jsonOut({ error: "accion desconocida: " + action });
  } catch (err) {
    return jsonOut({ error: String(err) });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (body.action === "agregar") return jsonOut(agregarMovimiento(ss, body));
    return jsonOut({ error: "accion desconocida: " + body.action });
  } catch (err) {
    return jsonOut({ error: String(err) });
  }
}

function getResumen(ss, mes) {
  if (!mes) return { error: "falta el parametro mes" };
  var sh = ss.getSheetByName(sheetCodeForMes(mes));
  if (!sh) return { error: "no existe la hoja del mes: " + mes };
  var g = function (a1) { return sh.getRange(a1).getValue(); };
  return {
    mes: g(ROW.MES_LABEL),
    ingresoTotal: g(ROW.INGRESO_TOTAL),
    presupuestoPorAsignar: g(ROW.PRESUPUESTO_ASIGNAR),
    totalGastado: g(ROW.TOTAL_GASTADO),
    totalAhorrado: g(ROW.TOTAL_AHORRADO),
    plan: {
      necesidades: g(ROW.PLAN_NECESIDADES), necesidadesPct: g(ROW.PLAN_NECESIDADES_PCT),
      deseos: g(ROW.PLAN_DESEOS), deseosPct: g(ROW.PLAN_DESEOS_PCT),
      ahorros: g(ROW.PLAN_AHORROS), ahorrosPct: g(ROW.PLAN_AHORROS_PCT),
    },
    actual: {
      ingreso: g(ROW.ACT_INGRESO),
      gastos: g(ROW.ACT_GASTOS),
      facturas: g(ROW.ACT_FACTURAS),
      ahorros: g(ROW.ACT_AHORROS),
      inversion: g(ROW.ACT_INVERSION),
      deuda: g(ROW.ACT_DEUDA),
      restante: g(ROW.ACT_RESTANTE),
    },
  };
}

function getHistorial(ss, mes, limit) {
  limit = parseInt(limit, 10) || 30;
  var sh = ss.getSheetByName(MOV_SHEET);
  if (!sh) return { error: "no existe la hoja Movimientos" };
  var values = sh.getRange(5, 1, sh.getLastRow() - 4, 6).getValues(); // A5:F (despues del encabezado en fila 4)
  var out = [];
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    if (!row[3] && !row[5]) continue; // fila vacia
    if (mes && row[1] !== mes) continue;
    out.push({
      fecha: row[0] instanceof Date ? Utilities.formatDate(row[0], Session.getScriptTimeZone(), "dd/MM/yyyy") : row[0],
      mes: row[1],
      tipo: row[2],
      concepto: row[3],
      necesidad: row[4],
      monto: row[5],
    });
  }
  out.reverse(); // mas reciente primero
  return out.slice(0, limit);
}

function agregarMovimiento(ss, body) {
  if (!body.mes || !body.tipo || !body.concepto || body.monto === undefined) {
    return { error: "faltan campos (mes, tipo, concepto, monto)" };
  }
  var sh = ss.getSheetByName(MOV_SHEET);
  if (!sh) return { error: "no existe la hoja Movimientos" };
  var lastRow = Math.max(sh.getLastRow(), 4);
  sh.getRange(lastRow + 1, 1, 1, 6).setValues([[
    body.fecha || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy"),
    body.mes,
    body.tipo,
    body.concepto,
    body.necesidad || "",
    Number(body.monto),
  ]]);
  return { ok: true };
}
