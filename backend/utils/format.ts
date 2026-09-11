/**
 * Utilidades de formato y parseo
 * Convención argentina: punto para miles, coma para decimales
 */

export function parseMonto(input: string | number): number {
  if (typeof input === 'number') return input;

  if (!input || typeof input !== 'string') return 0;

  // Limpiar espacios
  let cleaned = input.trim();

  // Convención argentina: punto = miles, coma = decimal
  // Ej: "1.234.567,89" → 1234567.89
  // Ej: "45.000" → 45000
  // Ej: "0,045" → 0.045

  // Reemplazar último punto que sea separador de decimales (si hay coma después)
  // Si la string tiene coma, el último punto es miles, la coma es decimal
  if (cleaned.includes(',')) {
    // Hay coma: reemplazar puntos por nada (miles), coma por punto (decimal)
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.lastIndexOf('.') !== -1) {
    // Hay puntos pero no coma: podría ser miles o decimal
    // Si hay 3 dígitos después del último punto, es decimal
    const parts = cleaned.split('.');
    const lastPart = parts[parts.length - 1];

    if (lastPart.length <= 2) {
      // Es decimal (máximo 2 dígitos en cripto para ARS/USD)
      // Pero en el contexto de argentina, esto sería ambiguo
      // Por seguridad, si solo tiene 1-2 dígitos después del último punto, es decimal
      // Si tiene más, son miles
      if (lastPart.length === 1 || lastPart.length === 2) {
        // Es decimal: "1.23" → 1.23
        cleaned = cleaned;
      } else {
        // Es miles: "1.234" → 1234
        cleaned = cleaned.replace(/\./g, '');
      }
    } else {
      // Son miles
      cleaned = cleaned.replace(/\./g, '');
    }
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function formatMonto(monto: number, moneda: 'ARS' | 'USD' | 'BTC' = 'ARS'): string {
  if (isNaN(monto)) return '0';

  let formatted: string;
  let symbol: string;

  switch (moneda) {
    case 'USD':
      symbol = 'US$';
      // USD: 2 decimales
      formatted = monto.toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      break;
    case 'BTC':
      symbol = '₿';
      // BTC: hasta 8 decimales
      formatted = monto.toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8,
      });
      break;
    case 'ARS':
    default:
      symbol = '$';
      // ARS: 2 decimales
      formatted = monto.toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      break;
  }

  return `${symbol} ${formatted}`;
}

/**
 * Formatear fecha ISO (YYYY-MM-DD) a formato local (DD/MM/YYYY)
 */
export function formatFecha(isoDate: string | null | undefined): string {
  if (!isoDate) return '';

  try {
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  } catch {
    return isoDate;
  }
}

/**
 * Parsear fecha local (DD/MM/YYYY) a ISO (YYYY-MM-DD)
 */
export function parseISO(fechaLocal: string): string {
  if (!fechaLocal) return '';

  try {
    const [day, month, year] = fechaLocal.split('/');
    return `${year}-${month}-${day}`;
  } catch {
    return fechaLocal;
  }
}

/**
 * Correr una fecha ISO una cantidad de meses, conservando el día
 * Si el día no existe en el mes destino, usa el último día del mes
 * Ej: 2026-01-31 + 1 mes = 2026-02-28
 */
export function shiftFechaMes(isoDate: string, deltaMeses: number): string {
  try {
    const date = new Date(isoDate + 'T00:00:00');
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // getMonth() retorna 0-11
    const day = date.getDate();

    let newMonth = month + deltaMeses;
    let newYear = year;

    // Ajustar año si es necesario
    while (newMonth > 12) {
      newMonth -= 12;
      newYear += 1;
    }
    while (newMonth < 1) {
      newMonth += 12;
      newYear -= 1;
    }

    // Obtener último día del mes destino
    const lastDayOfMonth = new Date(newYear, newMonth, 0).getDate();
    const newDay = Math.min(day, lastDayOfMonth);

    const result = new Date(newYear, newMonth - 1, newDay);
    const yyyy = result.getFullYear();
    const mm = String(result.getMonth() + 1).padStart(2, '0');
    const dd = String(result.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return isoDate;
  }
}

/**
 * Obtener año-mes actual en formato YYYY-MM
 */
export function hoyYM(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

/**
 * Obtener fecha actual en formato YYYY-MM-DD
 */
export function hoy(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
