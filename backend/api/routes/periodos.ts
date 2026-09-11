import { Router, Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../db/client.js';
import { PeriodoWithKPIs } from '../../types/index.js';
import { ValidationError, NotFoundError } from '../../middleware/errors.js';
import { kpisPeriodo, cotizacionesVigentes, recalcAcumulado } from '../../utils/calc.js';
import { hoy } from '../../utils/format.js';

const router = Router();

/**
 * GET /api/periodos
 * Listar todos los períodos
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('periodos')
      .select('*')
      .order('anio', { ascending: false })
      .order('mes', { ascending: false });

    if (error) throw error;

    res.json({ data: data || [], total: data?.length || 0 });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/periodos/:id
 * Obtener detalles de un período + KPIs
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { data: periodo, error } = await supabaseAdmin
      .from('periodos')
      .select('*')
      .eq('id', parseInt(id))
      .single();

    if (error || !periodo) {
      throw new NotFoundError(`Período ${id} no encontrado`);
    }

    // Calcular KPIs en vivo
    const kpis = await kpisPeriodo(periodo);

    const response: PeriodoWithKPIs = {
      ...periodo,
      ingresos_mes_calculado: kpis.ingresos,
      gastos_mes_calculado: kpis.gastos,
      ahorro_mes_calculado: kpis.ahorro,
    };

    res.json({ periodo: response });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/periodos
 * Crear nuevo período
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { anio, mes } = req.body;

    // Validar
    if (!anio || !mes) {
      throw new ValidationError('año y mes son requeridos');
    }

    if (mes < 1 || mes > 12) {
      throw new ValidationError('mes debe estar entre 1 y 12');
    }

    // Verificar que no existe
    const { data: existing } = await supabaseAdmin
      .from('periodos')
      .select('id')
      .eq('anio', anio)
      .eq('mes', mes)
      .single();

    if (existing) {
      throw new ValidationError(`Período ${anio}-${mes} ya existe`);
    }

    // Crear
    const { data: newPeriodo, error } = await supabaseAdmin
      .from('periodos')
      .insert({ anio, mes, estado: 'abierto' })
      .select()
      .single();

    if (error) throw error;

    const kpis = await kpisPeriodo(newPeriodo);
    const response: PeriodoWithKPIs = {
      ...newPeriodo,
      ingresos_mes_calculado: kpis.ingresos,
      gastos_mes_calculado: kpis.gastos,
      ahorro_mes_calculado: kpis.ahorro,
    };

    res.status(201).json({ periodo: response });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/periodos/:id/cerrar
 * Cerrar un período (operación crítica)
 * - Congela datos
 * - Crea siguiente mes si es el último
 * - Copia recurrentes
 */
router.post('/:id/cerrar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const periodoId = parseInt(id);

    // Obtener período
    const { data: periodo, error: periodoError } = await supabaseAdmin
      .from('periodos')
      .select('*')
      .eq('id', periodoId)
      .single();

    if (periodoError || !periodo) {
      throw new NotFoundError(`Período ${id} no encontrado`);
    }

    if (periodo.estado === 'cerrado') {
      throw new ValidationError('Período ya está cerrado');
    }

    // Obtener cotizaciones vigentes
    const cotizaciones = await cotizacionesVigentes();

    // Calcular KPIs
    const kpis = await kpisPeriodo(periodo);

    // Transacción: actualizar período + movimientos
    const { error: updateError } = await supabaseAdmin
      .from('periodos')
      .update({
        estado: 'cerrado',
        fecha_cierre: hoy(),
        ingresos_mes: kpis.ingresos,
        gastos_mes: kpis.gastos,
        ahorro_mes: kpis.ahorro,
        cotiz_usd_ars_cierre: cotizaciones.usd_ars,
        cotiz_btc_usd_cierre: cotizaciones.btc_usd,
      })
      .eq('id', periodoId);

    if (updateError) throw updateError;

    // Freeze monto_ars en todos los movimientos del período
    const { data: movimientos } = await supabaseAdmin
      .from('movimientos')
      .select('*')
      .eq('periodo_id', periodoId);

    if (movimientos) {
      for (const mov of movimientos) {
        // Si no tiene monto_ars, calcularlo y guardarlo
        if (mov.monto_ars === null) {
          let montoArs = mov.monto;
          if (mov.moneda === 'USD' && cotizaciones.usd_ars) {
            montoArs = mov.monto * cotizaciones.usd_ars;
          } else if (mov.moneda === 'BTC' && cotizaciones.btc_usd && cotizaciones.usd_ars) {
            montoArs = mov.monto * cotizaciones.btc_usd * cotizaciones.usd_ars;
          }

          await supabaseAdmin
            .from('movimientos')
            .update({ monto_ars: montoArs })
            .eq('id', mov.id);
        }
      }
    }

    // Verificar si es el último período
    const { data: ultimos } = await supabaseAdmin
      .from('periodos')
      .select('id, anio, mes')
      .order('anio', { ascending: false })
      .order('mes', { ascending: false })
      .limit(1);

    const esUltimo = ultimos && ultimos[0]?.id === periodoId;

    let periodoSiguiente = null;

    if (esUltimo) {
      // Crear siguiente mes
      let nextMes = periodo.mes + 1;
      let nextAnio = periodo.anio;

      if (nextMes > 12) {
        nextMes = 1;
        nextAnio += 1;
      }

      const { data: newPeriodo, error: newPeriodoError } = await supabaseAdmin
        .from('periodos')
        .insert({ anio: nextAnio, mes: nextMes, estado: 'abierto' })
        .select()
        .single();

      if (!newPeriodoError && newPeriodo) {
        periodoSiguiente = newPeriodo;

        // Copiar recurrentes al siguiente mes
        const { data: recurrentes } = await supabaseAdmin
          .from('conceptos')
          .select('*')
          .eq('es_recurrente', true)
          .eq('activo', true);

        if (recurrentes) {
          for (const concepto of recurrentes) {
            // Verificar que no existe movimiento para este concepto en el siguiente mes
            const { data: existing } = await supabaseAdmin
              .from('movimientos')
              .select('id')
              .eq('periodo_id', newPeriodo.id)
              .eq('concepto_id', concepto.id)
              .single();

            if (!existing) {
              // Calcular nuevo vencimiento (correr 1 mes)
              let newVencimiento = null;
              if (movimientos) {
                const lastVencimiento = movimientos
                  .filter((m) => m.concepto_id === concepto.id && m.fecha_vencimiento)
                  .sort((a, b) => (b.fecha_vencimiento || '').localeCompare(a.fecha_vencimiento || ''))[0];

                if (lastVencimiento?.fecha_vencimiento) {
                  // Correr la fecha un mes
                  const [year, month, day] = lastVencimiento.fecha_vencimiento.split('-');
                  let newMonth = parseInt(month) + 1;
                  let newYear = parseInt(year);
                  if (newMonth > 12) {
                    newMonth = 1;
                    newYear += 1;
                  }
                  const lastDayOfMonth = new Date(newYear, newMonth, 0).getDate();
                  const newDay = Math.min(parseInt(day), lastDayOfMonth);
                  newVencimiento = `${newYear}-${String(newMonth).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`;
                }
              }

              await supabaseAdmin.from('movimientos').insert({
                periodo_id: newPeriodo.id,
                concepto_id: concepto.id,
                monto: concepto.monto_referencia || 0,
                moneda: concepto.moneda,
                estado: 'pendiente',
                fecha_vencimiento: newVencimiento,
                vino_de_recurrente: true,
              });
            }
          }
        }
      }
    }

    // Recalcular acumulado
    await recalcAcumulado();

    const kpisUpdated = await kpisPeriodo(periodo);
    const periodoCerrado: PeriodoWithKPIs = {
      ...periodo,
      estado: 'cerrado',
      fecha_cierre: hoy(),
      ingresos_mes: kpis.ingresos,
      gastos_mes: kpis.gastos,
      ahorro_mes: kpis.ahorro,
      ingresos_mes_calculado: kpisUpdated.ingresos,
      gastos_mes_calculado: kpisUpdated.gastos,
      ahorro_mes_calculado: kpisUpdated.ahorro,
    };

    res.json({
      periodo_cerrado: periodoCerrado,
      periodo_siguiente_creado: periodoSiguiente || null,
      mensaje: 'Período cerrado exitosamente',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/periodos/:id/reabrir
 * Reabrir un período cerrado
 */
router.post('/:id/reabrir', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const periodoId = parseInt(id);

    // Obtener período
    const { data: periodo, error: periodoError } = await supabaseAdmin
      .from('periodos')
      .select('*')
      .eq('id', periodoId)
      .single();

    if (periodoError || !periodo) {
      throw new NotFoundError(`Período ${id} no encontrado`);
    }

    if (periodo.estado !== 'cerrado') {
      throw new ValidationError('Período no está cerrado');
    }

    // Actualizar período: descongelar
    const { error: updateError } = await supabaseAdmin
      .from('periodos')
      .update({
        estado: 'abierto',
        fecha_cierre: null,
        ingresos_mes: null,
        gastos_mes: null,
        ahorro_mes: null,
        cotiz_usd_ars_cierre: null,
        cotiz_btc_usd_cierre: null,
      })
      .eq('id', periodoId);

    if (updateError) throw updateError;

    // Limpiar monto_ars de todos los movimientos
    const { error: movError } = await supabaseAdmin
      .from('movimientos')
      .update({ monto_ars: null })
      .eq('periodo_id', periodoId);

    if (movError) throw movError;

    // Recalcular acumulado
    await recalcAcumulado();

    const updated = { ...periodo, estado: 'abierto' };
    const kpis = await kpisPeriodo(updated);

    res.json({
      periodo: {
        ...updated,
        estado: 'abierto',
        fecha_cierre: null,
        ingresos_mes_calculado: kpis.ingresos,
        gastos_mes_calculado: kpis.gastos,
        ahorro_mes_calculado: kpis.ahorro,
      },
      mensaje: 'Período reabierto',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
