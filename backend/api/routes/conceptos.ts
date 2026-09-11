import { Router, Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../db/client.js';
import { ValidationError, NotFoundError } from '../../middleware/errors.js';

const router = Router();

/**
 * GET /api/conceptos
 * Listar conceptos
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tipo, recurrente } = req.query;

    let query = supabaseAdmin.from('conceptos').select(`
      *,
      categorias:categoria_id (id, nombre, color, tipo)
    `);

    if (tipo) {
      query = query.eq('tipo', tipo);
    }

    if (recurrente !== undefined) {
      query = query.eq('es_recurrente', recurrente === 'true');
    }

    const { data, error } = await query.order('id', { ascending: true });

    if (error) throw error;

    res.json({ data: data || [] });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/conceptos
 * Crear concepto
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      nombre,
      tipo,
      categoria_id,
      cuenta_id,
      integrante_id,
      moneda,
      es_recurrente,
      monto_referencia,
    } = req.body;

    // Validar
    if (!nombre || !tipo) {
      throw new ValidationError('nombre y tipo son requeridos');
    }

    if (!['ingreso', 'gasto'].includes(tipo)) {
      throw new ValidationError('tipo debe ser "ingreso" o "gasto"');
    }

    // Crear concepto
    const { data: newConcepto, error } = await supabaseAdmin
      .from('conceptos')
      .insert({
        nombre,
        tipo,
        categoria_id,
        cuenta_id,
        integrante_id,
        moneda: moneda || 'ARS',
        es_recurrente: es_recurrente || false,
        monto_referencia: es_recurrente ? monto_referencia : null,
        activo: true,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ concepto: newConcepto });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/conceptos/:id
 * Actualizar concepto
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validar que concepto existe
    const { data: concepto } = await supabaseAdmin
      .from('conceptos')
      .select('id')
      .eq('id', parseInt(id))
      .single();

    if (!concepto) {
      throw new NotFoundError(`Concepto ${id} no encontrado`);
    }

    // Actualizar
    const { data: updated, error } = await supabaseAdmin
      .from('conceptos')
      .update(updates)
      .eq('id', parseInt(id))
      .select()
      .single();

    if (error) throw error;

    res.json({ concepto: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/conceptos/:id
 * Borrar concepto (solo si no tiene movimientos)
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Validar que concepto existe
    const { data: concepto } = await supabaseAdmin
      .from('conceptos')
      .select('id')
      .eq('id', parseInt(id))
      .single();

    if (!concepto) {
      throw new NotFoundError(`Concepto ${id} no encontrado`);
    }

    // Verificar que no tiene movimientos
    const { data: movimientos } = await supabaseAdmin
      .from('movimientos')
      .select('id')
      .eq('concepto_id', parseInt(id))
      .limit(1);

    if (movimientos && movimientos.length > 0) {
      throw new ValidationError('No se puede borrar concepto que tiene movimientos');
    }

    // Borrar
    const { error } = await supabaseAdmin.from('conceptos').delete().eq('id', parseInt(id));

    if (error) throw error;

    res.json({ concepto, mensaje: 'Concepto borrado' });
  } catch (err) {
    next(err);
  }
});

export default router;
