import { Router, Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../db/client.js';
import { ValidationError, NotFoundError } from '../../middleware/errors.js';

const router = Router();

/**
 * GET /api/cotizaciones
 * Listar todas las cotizaciones del usuario
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new ValidationError('Usuario no autenticado');
    }

    const { data: cotizaciones, error } = await supabaseAdmin
      .from('cotizaciones')
      .select('*')
      .eq('usuario_id', userId)
      .order('fecha_vigencia', { ascending: false });

    if (error) throw error;

    res.json({ data: cotizaciones || [] });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/cotizaciones/vigentes
 * Obtener cotizaciones vigentes actuales
 */
router.get('/vigentes/actuales', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new ValidationError('Usuario no autenticado');
    }

    // Obtener la cotización más reciente vigente para cada par de monedas
    const { data: cotizaciones, error } = await supabaseAdmin
      .from('cotizaciones')
      .select('*')
      .eq('usuario_id', userId)
      .eq('es_vigente', true)
      .order('fecha_vigencia', { ascending: false });

    if (error) throw error;

    // Agrupar por par de monedas y tomar la más reciente
    const vigentes: { [key: string]: any } = {};
    (cotizaciones || []).forEach((cot) => {
      const key = `${cot.moneda_origen}-${cot.moneda_destino}`;
      if (!vigentes[key]) {
        vigentes[key] = cot;
      }
    });

    res.json({ data: Object.values(vigentes) });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/cotizaciones/:id
 * Obtener detalle de una cotización
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const { data: cotizacion, error } = await supabaseAdmin
      .from('cotizaciones')
      .select('*')
      .eq('id', parseInt(id))
      .eq('usuario_id', userId)
      .single();

    if (error || !cotizacion) {
      throw new NotFoundError(`Cotización ${id} no encontrada`);
    }

    res.json({ cotizacion });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/cotizaciones
 * Crear nueva cotización
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new ValidationError('Usuario no autenticado');
    }

    const { moneda_origen, moneda_destino, tasa_cambio, fecha_vigencia } = req.body;

    // Validaciones
    if (!moneda_origen || !moneda_destino || !tasa_cambio) {
      throw new ValidationError('Moneda origen, destino y tasa son requeridas');
    }

    if (tasa_cambio <= 0) {
      throw new ValidationError('Tasa de cambio debe ser mayor a 0');
    }

    if (moneda_origen === moneda_destino) {
      throw new ValidationError('Las monedas origen y destino no pueden ser iguales');
    }

    const monedas = ['ARS', 'USD', 'BTC'];
    if (!monedas.includes(moneda_origen) || !monedas.includes(moneda_destino)) {
      throw new ValidationError('Monedas válidas: ARS, USD, BTC');
    }

    // Si es vigente, desactivar otras del mismo par
    if (req.body.es_vigente) {
      await supabaseAdmin
        .from('cotizaciones')
        .update({ es_vigente: false })
        .eq('usuario_id', userId)
        .eq('moneda_origen', moneda_origen)
        .eq('moneda_destino', moneda_destino);
    }

    // Crear cotización
    const { data: newCotizacion, error } = await supabaseAdmin
      .from('cotizaciones')
      .insert({
        usuario_id: userId,
        moneda_origen,
        moneda_destino,
        tasa_cambio,
        fecha_vigencia: fecha_vigencia || new Date().toISOString().split('T')[0],
        es_vigente: req.body.es_vigente || true,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ cotizacion: newCotizacion });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/cotizaciones/:id
 * Actualizar cotización
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const updates = req.body;

    // Validar que cotización pertenece al usuario
    const { data: cotizacion } = await supabaseAdmin
      .from('cotizaciones')
      .select('*')
      .eq('id', parseInt(id))
      .eq('usuario_id', userId)
      .single();

    if (!cotizacion) {
      throw new NotFoundError(`Cotización ${id} no encontrada`);
    }

    // Validaciones de updates
    if (updates.tasa_cambio !== undefined && updates.tasa_cambio <= 0) {
      throw new ValidationError('Tasa de cambio debe ser mayor a 0');
    }

    if (updates.moneda_origen && updates.moneda_destino) {
      if (updates.moneda_origen === updates.moneda_destino) {
        throw new ValidationError('Las monedas origen y destino no pueden ser iguales');
      }
    }

    // Si se marca como vigente, desactivar otras del mismo par
    if (updates.es_vigente) {
      await supabaseAdmin
        .from('cotizaciones')
        .update({ es_vigente: false })
        .eq('usuario_id', userId)
        .eq('moneda_origen', updates.moneda_origen || cotizacion.moneda_origen)
        .eq('moneda_destino', updates.moneda_destino || cotizacion.moneda_destino)
        .neq('id', parseInt(id));
    }

    // Actualizar
    const { data: updated, error } = await supabaseAdmin
      .from('cotizaciones')
      .update({
        ...updates,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', parseInt(id))
      .select()
      .single();

    if (error) throw error;

    res.json({ cotizacion: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/cotizaciones/:id
 * Eliminar cotización
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    // Validar que cotización pertenece al usuario
    const { data: cotizacion } = await supabaseAdmin
      .from('cotizaciones')
      .select('id')
      .eq('id', parseInt(id))
      .eq('usuario_id', userId)
      .single();

    if (!cotizacion) {
      throw new NotFoundError(`Cotización ${id} no encontrada`);
    }

    // Eliminar
    const { error } = await supabaseAdmin
      .from('cotizaciones')
      .delete()
      .eq('id', parseInt(id));

    if (error) throw error;

    res.json({ mensaje: 'Cotización eliminada exitosamente' });
  } catch (err) {
    next(err);
  }
});

export default router;
