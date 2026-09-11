import { Router, Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../db/client.js';
import { ValidationError, NotFoundError } from '../../middleware/errors.js';

const router = Router();

/**
 * GET /api/metas
 * Listar todas las metas del usuario
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new ValidationError('Usuario no autenticado');
    }

    const { data: metas, error } = await supabaseAdmin
      .from('metas')
      .select('*')
      .eq('usuario_id', userId)
      .order('creado_en', { ascending: false });

    if (error) throw error;

    // Agregar campos calculados
    const metasConProgreso = (metas || []).map((meta) => ({
      ...meta,
      porcentaje: (meta.monto_actual / meta.monto_objetivo) * 100,
      completada: meta.monto_actual >= meta.monto_objetivo,
      dias_restantes: meta.fecha_objetivo ? Math.ceil((new Date(meta.fecha_objetivo).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
    }));

    res.json({ data: metasConProgreso });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/metas/:id
 * Obtener detalle de una meta
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const { data: meta, error } = await supabaseAdmin
      .from('metas')
      .select('*')
      .eq('id', parseInt(id))
      .eq('usuario_id', userId)
      .single();

    if (error || !meta) {
      throw new NotFoundError(`Meta ${id} no encontrada`);
    }

    const metaConProgreso = {
      ...meta,
      porcentaje: (meta.monto_actual / meta.monto_objetivo) * 100,
      completada: meta.monto_actual >= meta.monto_objetivo,
      dias_restantes: meta.fecha_objetivo ? Math.ceil((new Date(meta.fecha_objetivo).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
    };

    res.json({ meta: metaConProgreso });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/metas
 * Crear nueva meta
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new ValidationError('Usuario no autenticado');
    }

    const { nombre, descripcion, monto_objetivo, fecha_objetivo, monto_actual } = req.body;

    // Validaciones
    if (!nombre || nombre.trim().length === 0) {
      throw new ValidationError('Nombre de meta es requerido');
    }

    if (!monto_objetivo || monto_objetivo <= 0) {
      throw new ValidationError('Monto objetivo debe ser mayor a 0');
    }

    if (monto_actual !== undefined && monto_actual < 0) {
      throw new ValidationError('Monto actual no puede ser negativo');
    }

    // Crear meta
    const { data: newMeta, error } = await supabaseAdmin
      .from('metas')
      .insert({
        usuario_id: userId,
        nombre: nombre.trim(),
        descripcion: descripcion || null,
        monto_objetivo,
        monto_actual: monto_actual || 0,
        fecha_objetivo: fecha_objetivo || null,
      })
      .select()
      .single();

    if (error) throw error;

    const metaConProgreso = {
      ...newMeta,
      porcentaje: (newMeta.monto_actual / newMeta.monto_objetivo) * 100,
      completada: newMeta.monto_actual >= newMeta.monto_objetivo,
      dias_restantes: newMeta.fecha_objetivo ? Math.ceil((new Date(newMeta.fecha_objetivo).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
    };

    res.status(201).json({ meta: metaConProgreso });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/metas/:id
 * Actualizar meta
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const updates = req.body;

    // Validar que meta pertenece al usuario
    const { data: meta } = await supabaseAdmin
      .from('metas')
      .select('id')
      .eq('id', parseInt(id))
      .eq('usuario_id', userId)
      .single();

    if (!meta) {
      throw new NotFoundError(`Meta ${id} no encontrada`);
    }

    // Validaciones de updates
    if (updates.nombre !== undefined && updates.nombre.trim().length === 0) {
      throw new ValidationError('Nombre no puede estar vacío');
    }

    if (updates.monto_objetivo !== undefined && updates.monto_objetivo <= 0) {
      throw new ValidationError('Monto objetivo debe ser mayor a 0');
    }

    if (updates.monto_actual !== undefined && updates.monto_actual < 0) {
      throw new ValidationError('Monto actual no puede ser negativo');
    }

    // Actualizar
    const { data: updated, error } = await supabaseAdmin
      .from('metas')
      .update({
        ...updates,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', parseInt(id))
      .select()
      .single();

    if (error) throw error;

    const metaConProgreso = {
      ...updated,
      porcentaje: (updated.monto_actual / updated.monto_objetivo) * 100,
      completada: updated.monto_actual >= updated.monto_objetivo,
      dias_restantes: updated.fecha_objetivo ? Math.ceil((new Date(updated.fecha_objetivo).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
    };

    res.json({ meta: metaConProgreso });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/metas/:id
 * Eliminar meta
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    // Validar que meta pertenece al usuario
    const { data: meta } = await supabaseAdmin
      .from('metas')
      .select('id')
      .eq('id', parseInt(id))
      .eq('usuario_id', userId)
      .single();

    if (!meta) {
      throw new NotFoundError(`Meta ${id} no encontrada`);
    }

    // Eliminar
    const { error } = await supabaseAdmin
      .from('metas')
      .delete()
      .eq('id', parseInt(id));

    if (error) throw error;

    res.json({ mensaje: 'Meta eliminada exitosamente' });
  } catch (err) {
    next(err);
  }
});

export default router;
