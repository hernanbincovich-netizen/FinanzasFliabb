import { Router, Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../db/client.js';
import { ValidationError, NotFoundError } from '../../middleware/errors.js';

const router = Router();

/**
 * GET /api/periodos/:periodoId/movimientos
 * Listar movimientos de un período
 */
router.get('/:periodoId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { periodoId } = req.params;

    // Verificar que período existe
    const { data: periodo } = await supabaseAdmin
      .from('periodos')
      .select('id')
      .eq('id', parseInt(periodoId))
      .single();

    if (!periodo) {
      throw new NotFoundError(`Período ${periodoId} no encontrado`);
    }

    // Traer movimientos con info de concepto y categoría
    const { data: movimientos, error } = await supabaseAdmin
      .from('movimientos')
      .select(`
        *,
        conceptos:concepto_id (
          nombre,
          tipo,
          categoria_id,
          categorias:categoria_id (nombre, color)
        ),
        cuentas:cuenta_id (nombre)
      `)
      .eq('periodo_id', parseInt(periodoId))
      .order('creado_en', { ascending: false });

    if (error) throw error;

    res.json({ data: movimientos || [] });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/periodos/:periodoId/movimientos
 * Crear movimiento en un período
 */
router.post('/:periodoId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { periodoId } = req.params;
    const { concepto_id, monto, moneda, cuenta_id, estado, fecha_vencimiento, nota } = req.body;

    // Validar período existe y está abierto
    const { data: periodo } = await supabaseAdmin
      .from('periodos')
      .select('estado')
      .eq('id', parseInt(periodoId))
      .single();

    if (!periodo) {
      throw new NotFoundError(`Período ${periodoId} no encontrado`);
    }

    if (periodo.estado !== 'abierto') {
      throw new ValidationError('Período debe estar abierto para agregar movimientos');
    }

    // Validar concepto existe
    const { data: concepto } = await supabaseAdmin
      .from('conceptos')
      .select('id')
      .eq('id', concepto_id)
      .single();

    if (!concepto) {
      throw new ValidationError(`Concepto ${concepto_id} no existe`);
    }

    // Validar que no existe movimiento para este concepto en este período
    const { data: existing } = await supabaseAdmin
      .from('movimientos')
      .select('id')
      .eq('periodo_id', parseInt(periodoId))
      .eq('concepto_id', concepto_id)
      .single();

    if (existing) {
      throw new ValidationError('Ya existe un movimiento para este concepto en este período');
    }

    // Crear movimiento
    const { data: newMovimiento, error } = await supabaseAdmin
      .from('movimientos')
      .insert({
        periodo_id: parseInt(periodoId),
        concepto_id,
        monto,
        moneda: moneda || 'ARS',
        estado: estado || 'pendiente',
        cuenta_id,
        fecha_vencimiento,
        nota,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ movimiento: newMovimiento });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/movimientos/:id
 * Actualizar movimiento
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validar que movimiento existe
    const { data: movimiento } = await supabaseAdmin
      .from('movimientos')
      .select('id, periodo_id, concepto_id')
      .eq('id', parseInt(id))
      .single();

    if (!movimiento) {
      throw new NotFoundError(`Movimiento ${id} no encontrado`);
    }

    // Validar que período está abierto
    const { data: periodo } = await supabaseAdmin
      .from('periodos')
      .select('estado')
      .eq('id', movimiento.periodo_id)
      .single();

    if (periodo?.estado !== 'abierto') {
      throw new ValidationError('No se puede editar movimientos en período cerrado');
    }

    // Si se intenta cambiar categoría, actualizar en concepto
    if (updates.categoria_id !== undefined) {
      const { concepto_id } = movimiento;
      await supabaseAdmin
        .from('conceptos')
        .update({ categoria_id: updates.categoria_id })
        .eq('id', concepto_id);

      delete updates.categoria_id;
    }

    // Actualizar movimiento
    const { data: updated, error } = await supabaseAdmin
      .from('movimientos')
      .update(updates)
      .eq('id', parseInt(id))
      .select()
      .single();

    if (error) throw error;

    res.json({ movimiento: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/movimientos/:id/estado
 * Toggle rápido de estado (pendiente ↔ pagado)
 */
router.patch('/:id/estado', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Obtener estado actual
    const { data: movimiento } = await supabaseAdmin
      .from('movimientos')
      .select('id, estado, periodo_id')
      .eq('id', parseInt(id))
      .single();

    if (!movimiento) {
      throw new NotFoundError(`Movimiento ${id} no encontrado`);
    }

    // Validar período abierto
    const { data: periodo } = await supabaseAdmin
      .from('periodos')
      .select('estado')
      .eq('id', movimiento.periodo_id)
      .single();

    if (periodo?.estado !== 'abierto') {
      throw new ValidationError('No se puede cambiar estado en período cerrado');
    }

    // Toggle
    const nuevoEstado = movimiento.estado === 'pendiente' ? 'pagado' : 'pendiente';

    const { data: updated, error } = await supabaseAdmin
      .from('movimientos')
      .update({ estado: nuevoEstado })
      .eq('id', parseInt(id))
      .select()
      .single();

    if (error) throw error;

    res.json({ movimiento: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/movimientos/:id
 * Borrar movimiento
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { borrar_concepto } = req.query;

    // Obtener movimiento (necesito concepto_id)
    const { data: movimiento } = await supabaseAdmin
      .from('movimientos')
      .select('id, periodo_id, concepto_id')
      .eq('id', parseInt(id))
      .single();

    if (!movimiento) {
      throw new NotFoundError(`Movimiento ${id} no encontrado`);
    }

    // Verificar período abierto
    const { data: periodo } = await supabaseAdmin
      .from('periodos')
      .select('estado')
      .eq('id', movimiento.periodo_id)
      .single();

    if (periodo?.estado !== 'abierto') {
      throw new ValidationError('No se puede borrar movimientos en período cerrado');
    }

    // Borrar movimiento
    const { error: deleteError } = await supabaseAdmin
      .from('movimientos')
      .delete()
      .eq('id', parseInt(id));

    if (deleteError) throw deleteError;

    // Si se pide borrar concepto y es no-recurrente, y no tiene más movimientos
    if (borrar_concepto === 'true') {
      const { data: concepto } = await supabaseAdmin
        .from('conceptos')
        .select('es_recurrente')
        .eq('id', movimiento.concepto_id)
        .single();

      if (concepto && !concepto.es_recurrente) {
        // Verificar que no hay otros movimientos
        const { data: otrosMovimientos } = await supabaseAdmin
          .from('movimientos')
          .select('id')
          .eq('concepto_id', movimiento.concepto_id)
          .limit(1);

        if (!otrosMovimientos || otrosMovimientos.length === 0) {
          // Borrar concepto
          await supabaseAdmin.from('conceptos').delete().eq('id', movimiento.concepto_id);
        }
      }
    }

    res.json({ movimiento, mensaje: 'Movimiento borrado' });
  } catch (err) {
    next(err);
  }
});

export default router;
