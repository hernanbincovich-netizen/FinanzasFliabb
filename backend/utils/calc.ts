/**
 * Lógica de cálculos financieros
 * Replica exactamente la lógica de js/calc.js de la app original
 */

import { supabaseAdmin } from '../db/client.js';
import { Periodo } from '../types/index.js';

interface CalculoResult {
  ingresos: number;
  gastos: number;
  ahorro: number;
}

/**
 * Obtener cotización vigente (última cargada por fecha)
 */
export async function cotizacionVigente(par: 'USD_ARS' | 'BTC_USD'): Promise<number | null> {
  const { data, error } = await supabaseAdmin
    .from('cotizaciones')
    .select('valor')
    .eq('par', par)
    .order('fecha', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data.valor;
}

/**
 * Obtener cotizaciones vigentes (las últimas de cada par)
 */
export async function cotizacionesVigentes(): Promise<{
  usd_ars: number | null;
  btc_usd: number | null;
}> {
  const [usdArs, btcUsd] = await Promise.all([
    cotizacionVigente('USD_ARS'),
    cotizacionVigente('BTC_USD'),
  ]);

  return { usd_ars: usdArs, btc_usd: btcUsd };
}

/**
 * Convertir monto a ARS usando cotización vigente
 * ARS → ARS (sin conversión)
 * USD → ARS (multiplica por USD/ARS)
 * BTC → ARS (BTC → USD → ARS, encadenado)
 */
export async function aArs(monto: number, moneda: 'ARS' | 'USD' | 'BTC'): Promise<number> {
  if (moneda === 'ARS' || monto === 0) return monto;

  const cotizaciones = await cotizacionesVigentes();

  if (moneda === 'USD') {
    if (cotizaciones.usd_ars === null) return monto; // Sin cotización, retorna el monto original
    return monto * cotizaciones.usd_ars;
  }

  if (moneda === 'BTC') {
    if (cotizaciones.btc_usd === null || cotizaciones.usd_ars === null) return monto;
    return monto * cotizaciones.btc_usd * cotizaciones.usd_ars;
  }

  return monto;
}

/**
 * Calcular ingresos de un período
 * Si está cerrado y tiene campo congelado, devuelve ese valor
 * Si está abierto, suma movimientos tipo "ingreso" convertidos a ARS
 */
export async function ingresos(periodo: Periodo): Promise<number> {
  // Si está cerrado y tiene el valor congelado, devolverlo
  if (periodo.estado === 'cerrado' && periodo.ingresos_mes !== null) {
    return periodo.ingresos_mes;
  }

  // Traer conceptos de ingreso primero
  const { data: ingresoConceptos, error: conceptError } = await supabaseAdmin
    .from('conceptos')
    .select('id')
    .eq('tipo', 'ingreso')
    .eq('activo', true);

  if (conceptError) return 0;

  const conceptIds = ingresoConceptos?.map((c) => c.id) || [];

  const { data: movimientos, error: movError } = await supabaseAdmin
    .from('movimientos')
    .select('monto, moneda')
    .eq('periodo_id', periodo.id)
    .in('concepto_id', conceptIds)
    .eq('estado', 'pagado');

  if (movError) return 0;

  let total = 0;
  for (const mov of movimientos || []) {
    const enArs = await aArs(mov.monto, mov.moneda as 'ARS' | 'USD' | 'BTC');
    total += enArs;
  }

  return total;
}

/**
 * Calcular gastos de un período (ídem a ingresos pero con tipo "gasto")
 */
export async function gastos(periodo: Periodo): Promise<number> {
  // Si está cerrado y tiene el valor congelado, devolverlo
  if (periodo.estado === 'cerrado' && periodo.gastos_mes !== null) {
    return periodo.gastos_mes;
  }

  const { data: gastoConceptos, error: conceptError } = await supabaseAdmin
    .from('conceptos')
    .select('id')
    .eq('tipo', 'gasto')
    .eq('activo', true);

  if (conceptError) return 0;

  const conceptIds = gastoConceptos?.map((c) => c.id) || [];

  const { data: movimientos, error: movError } = await supabaseAdmin
    .from('movimientos')
    .select('monto, moneda')
    .eq('periodo_id', periodo.id)
    .in('concepto_id', conceptIds)
    .eq('estado', 'pagado');

  if (movError) return 0;

  let total = 0;
  for (const mov of movimientos || []) {
    const enArs = await aArs(mov.monto, mov.moneda as 'ARS' | 'USD' | 'BTC');
    total += enArs;
  }

  return total;
}

/**
 * Calcular ahorro de un período = ingresos - gastos
 */
export async function ahorro(periodo: Periodo): Promise<number> {
  const ing = await ingresos(periodo);
  const gast = await gastos(periodo);
  return ing - gast;
}

/**
 * Calcular ahorro acumulado hasta un período (inclusive)
 */
export async function ahorroAcumulado(hastaPeriodoId: number): Promise<number> {
  // Traer todos los períodos hasta el dado, en orden cronológico
  const { data: periodos, error } = await supabaseAdmin
    .from('periodos')
    .select('*')
    .lte('id', hastaPeriodoId)
    .order('anio', { ascending: true })
    .order('mes', { ascending: true });

  if (error) {
    console.error('Error obteniendo períodos:', error);
    return 0;
  }

  let acum = 0;
  for (const per of periodos || []) {
    const aho = await ahorro(per);
    acum += aho;
  }

  return acum;
}

/**
 * Calcular KPIs de un período en tiempo real (usado en GET /periodos/:id)
 */
export async function kpisPeriodo(periodo: Periodo): Promise<CalculoResult> {
  const ing = await ingresos(periodo);
  const gast = await gastos(periodo);
  const aho = ing - gast;

  return { ingresos: ing, gastos: gast, ahorro: aho };
}

/**
 * Recalcular ahorro acumulado de todos los períodos cerrados
 * Se ejecuta después de cerrar o reabrir un mes
 */
export async function recalcAcumulado(): Promise<void> {
  const { data: periodos, error } = await supabaseAdmin
    .from('periodos')
    .select('id, estado')
    .order('anio', { ascending: true })
    .order('mes', { ascending: true });

  if (error) {
    console.error('Error en recalcAcumulado:', error);
    return;
  }

  let acum = 0;
  for (const per of periodos || []) {
    if (per.estado === 'cerrado' || per.estado === 'abierto') {
      const aho = await ahorro({ id: per.id } as Periodo);
      acum += aho;

      // Actualizar solo si está cerrado
      if (per.estado === 'cerrado') {
        await supabaseAdmin
          .from('periodos')
          .update({ ahorro_acumulado: acum })
          .eq('id', per.id);
      }
    }
  }
}
