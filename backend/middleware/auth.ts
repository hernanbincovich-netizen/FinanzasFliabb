import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

// Extender tipos de Express para agregar usuario autenticado
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function verifyAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({
        error: 'unauthorized',
        message: 'Token requerido'
      });
      return;
    }

    // Verificar token con Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({
        error: 'invalid_token',
        message: 'Token inválido o expirado'
      });
      return;
    }

    // Agregar usuario al request
    req.user = {
      id: data.user.id,
      email: data.user.email || ''
    };

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({
      error: 'internal_error',
      message: 'Error verificando autenticación'
    });
  }
}
