import { Router, Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../db/client.js';
import { ValidationError, NotFoundError } from '../../middleware/errors.js';

const router = Router();

/**
 * GET /api/presupuestos/periodo/:periodoId
 * Listar presupuestos de un período con gasto actual
 */
router.get('/periodo/:periodoId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { periodoId } = req.params;
    const userId = (req as any).user?.id;

    // Obtener presupuestos del período
    const { data: presupuestos, error: presError } = await supabaseAdmin
      .from('presupuestos')
      .select(`
        *,
        conceptos:concepto_id (id, nombre, tipo),
        periodos:periodo_id (id, mes, anio)
      `)
      .eq('periodo_id', parseInt(periodoId))
      .eq('usuario_id', userId)
      .order('creado_en', { ascending: false });

    if (presError) throw presError;

    // Para cada presupuesto, calcular gasto actual
    const presupuestosConGasto = await Promise.all(
      (presupuestos || []).map(async (pres) => {
        const { data: movimientos } = await supabaseAdmin
          .from('movimientos')
          .select('monto')
          .eq('periodo_id', parseInt(periodoId))
          .eq('concepto_id', pres.concepto_id)
          .eq('estado', 'pagado');

        const gastoActual = (movimientos || []).reduce((sum, m) => sum + (m.monto || 0), 0);

        return {
          ...pres,
          gasto_actual: gastoActual,
          porcentaje: (gastoActual / pres.monto_presupuestado) * 100,
          excedido: gastoActual > pres.monto_presupuestado,
        };
      })
    );

    res.json({ data: presupuestosConGasto || [] });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/presupuestos/:id
 * Obtener detalle de un presupuesto
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const { data: presupuesto, error } = await supabaseAdmin
      .from('presupuestos')
      .select(`
        *,
        conceptos:concepto_id (id, nombre, tipo),
        periodos:periodo_id (id, mes, anio)
      `)
      .eq('id', parseInt(id))
      .eq('usuario_id', userId)
      .single();

    if (error || !presupuesto) {
      throw new NotFoundError(`Presupuesto ${id} no encontrado`);
    }

    res.json({ presupuesto });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/presupuestos
 * Crear nuevo presupuesto
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new ValidationError('Usuario no autenticado');
    }

    const { periodo_id, concepto_id, monto_presupuestado } = req.body;

    // Validaciones
    if (!periodo_id || !concepto_id || !monto_presupuestado) {
      throw new ValidationError('Período, concepto y monto son requeridos');
    }

    if (monto_presupuestado <= 0) {
      throw new ValidationError('Monto debe ser mayor a 0');
    }

    // Verificar que período existe
    const { data: periodo } = await supabaseAdmin
      .from('periodos')
      .select('id')
      .eq('id', periodo_id)
      .eq('usuario_id', userId)
      .single();

    if (!periodo) {
      throw new NotFoundError('Período no encontrado');
    }

    // Verificar que concepto existe
    const { data: concepto } = await supabaseAdmin
      .from('conceptos')
      .select('id')
      .eq('id', concepto_id)
      .eq('usuario_id', userId)
      .single();

    if (!concepto) {
      throw new NotFoundError('Concepto no encontrado');
    }

    // Crear presupuesto
    const { data: newPresupuesto, error } = await supabaseAdmin
      .from('presupuestos')
      .insert({
        usuario_id: userId,
        periodo_id,
        concepto_id,
        monto_presupuestado,
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes('unique')) {
        throw new ValidationError('Ya existe presupuesto para este concepto en este período');
      }
      throw error;
    }

    res.status(201).json({ presupuesto: newPresupuesto });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/presupuestos/:id
 * Actualizar presupuesto
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const updates = req.body;

    // Validar que presupuesto pertenece al usuario
    const { data: presupuesto } = await supabaseAdmin
      .from('presupuestos')
      .select('id')
      .eq('id', parseInt(id))
      .eq('usuario_id', userId)
      .single();

    if (!presupuesto) {
      throw new NotFoundError(`Presupuesto ${id} no encontrado`);
    }

    // Validaciones de updates
    if (updates.monto_presupuestado !== undefined && updates.monto_presupuestado <= 0) {
      throw new ValidationError('Monto debe ser mayor a 0');
    }

    // Actualizar
    const { data: updated, error } = await supabaseAdmin
      .from('presupuestos')
      .update({
        ...updates,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', parseInt(id))
      .select()
      .single();

    if (error) throw error;

    res.json({ presupuesto: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/presupuestos/:id
 * Eliminar presupuesto
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    // Validar que presupuesto pertenece al usuario
    const { data: presupuesto } = await supabaseAdmin
      .from('presupuestos')
      .select('id')
      .eq('id', parseInt(id))
      .eq('usuario_id', userId)
      .single();

    if (!presupuesto) {
      throw new NotFoundError(`Presupuesto ${id} no encontrado`);
    }

    // Eliminar
    const { error } = await supabaseAdmin
      .from('presupuestos')
      .delete()
      .eq('id', parseInt(id));

    if (error) throw error;

    res.json({ mensaje: 'Presupuesto eliminado exitosamente' });
  } catch (err) {
    next(err);
  }
});

export default router;
