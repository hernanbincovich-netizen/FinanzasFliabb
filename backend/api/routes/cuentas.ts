import { Router, Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../db/client.js';
import { ValidationError, NotFoundError } from '../../middleware/errors.js';

const router = Router();

/**
 * GET /api/cuentas
 * Listar todas las cuentas del usuario
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new ValidationError('Usuario no autenticado');
    }

    const { data: cuentas, error } = await supabaseAdmin
      .from('cuentas')
      .select('*')
      .eq('usuario_id', userId)
      .order('creado_en', { ascending: false });

    if (error) throw error;

    res.json({ data: cuentas || [] });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/cuentas/:id
 * Obtener detalle de una cuenta
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const { data: cuenta, error } = await supabaseAdmin
      .from('cuentas')
      .select('*')
      .eq('id', parseInt(id))
      .eq('usuario_id', userId)
      .single();

    if (error || !cuenta) {
      throw new NotFoundError(`Cuenta ${id} no encontrada`);
    }

    res.json({ cuenta });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/cuentas
 * Crear nueva cuenta
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new ValidationError('Usuario no autenticado');
    }

    const { nombre, tipo, moneda, saldo_inicial } = req.body;

    // Validaciones
    if (!nombre || nombre.trim().length === 0) {
      throw new ValidationError('Nombre de cuenta es requerido');
    }

    if (saldo_inicial !== undefined && saldo_inicial < 0) {
      throw new ValidationError('Saldo inicial no puede ser negativo');
    }

    // Crear cuenta
    const { data: newCuenta, error } = await supabaseAdmin
      .from('cuentas')
      .insert({
        usuario_id: userId,
        nombre: nombre.trim(),
        tipo: tipo || 'banco',
        moneda: moneda || 'ARS',
        saldo_inicial: saldo_inicial || 0,
        saldo_actual: saldo_inicial || 0,
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes('unique')) {
        throw new ValidationError('Ya existe una cuenta con ese nombre');
      }
      throw error;
    }

    res.status(201).json({ cuenta: newCuenta });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/cuentas/:id
 * Actualizar cuenta
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const updates = req.body;

    // Validar que la cuenta pertenece al usuario
    const { data: cuenta } = await supabaseAdmin
      .from('cuentas')
      .select('id')
      .eq('id', parseInt(id))
      .eq('usuario_id', userId)
      .single();

    if (!cuenta) {
      throw new NotFoundError(`Cuenta ${id} no encontrada`);
    }

    // Validaciones de updates
    if (updates.nombre !== undefined && updates.nombre.trim().length === 0) {
      throw new ValidationError('Nombre no puede estar vacío');
    }

    if (updates.saldo_actual !== undefined && updates.saldo_actual < 0) {
      throw new ValidationError('Saldo no puede ser negativo');
    }

    // Actualizar
    const { data: updated, error } = await supabaseAdmin
      .from('cuentas')
      .update({
        ...updates,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', parseInt(id))
      .select()
      .single();

    if (error) throw error;

    res.json({ cuenta: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/cuentas/:id
 * Eliminar cuenta
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    // Validar que la cuenta pertenece al usuario
    const { data: cuenta } = await supabaseAdmin
      .from('cuentas')
      .select('id')
      .eq('id', parseInt(id))
      .eq('usuario_id', userId)
      .single();

    if (!cuenta) {
      throw new NotFoundError(`Cuenta ${id} no encontrada`);
    }

    // Eliminar
    const { error } = await supabaseAdmin
      .from('cuentas')
      .delete()
      .eq('id', parseInt(id));

    if (error) throw error;

    res.json({ mensaje: 'Cuenta eliminada exitosamente' });
  } catch (err) {
    next(err);
  }
});

export default router;
