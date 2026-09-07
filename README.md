# Mis Finanzas

Aplicación web moderna construida con **React, TypeScript y Tailwind CSS** para gestionar finanzas personales mediante la **Regla 50/30/20**, metas de ahorro y control de flujo de caja.

## Características

- **Tablero Dinámico 50/30/20**:
  - Evaluación en tiempo real: 50% Necesidades, 30% Deseos y 20% Ahorros & Inversión.
  - Indicador de salud financiera con diagnósticos automáticos.
  - Flujo neto disponible en el mes actual y barras de progreso por categoría (Facturas fijas, Gastos variables, Ahorros, Inversiones, Pago de deudas).
- **Gestión Completa de Movimientos (CRUD)**:
  - Registro de transacciones con sugerencias automáticas de conceptos.
  - Clasificación rápida entre ingresos, gastos, facturas y deudas.
  - Edición, duplicación y eliminación de registros.
- **Historial Avanzado y Filtros**:
  - Filtros combinados por mes, tipo de operación y regla 50/30/20.
  - Buscador en tiempo real por concepto o notas.
  - Ordenamiento por fecha o importe.
  - Exportación instantánea a archivo CSV (compatible con Excel y Google Sheets).
- **Metas y Fondos de Ahorro**:
  - Creación de metas con objetivos numéricos, fechas límites y porcentaje de avance.
  - Módulo de aportes rápidos con celebración al alcanzar el 100%.
- **Persistencia y Opciones de Sincronización**:
  - Almacenamiento local persistente (`localStorage`) en el navegador.
  - Copias de seguridad completas mediante exportación e importación en formato JSON.
  - Compatible con Webhooks de Google Apps Script (`Code.gs`) para conectar con Google Sheets.

## Tecnologías

- **React 19** + **TypeScript**
- **Vite**
- **Tailwind CSS**
- **Lucide Icons**
- **Canvas Confetti**
