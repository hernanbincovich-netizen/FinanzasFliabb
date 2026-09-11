import { Router, Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../db/client.js';
import { LoginRequest, RegisterRequest, AuthResponse } from '../../types/index.js';
import { ValidationError } from '../../middleware/errors.js';

const router = Router();

/**
 * POST /api/auth/register
 * Registrar nuevo usuario
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as RegisterRequest;

    // Validar
    if (!email || !password) {
      throw new ValidationError('Email y password son requeridos');
    }

    if (password.length < 6) {
      throw new ValidationError('Password debe tener al menos 6 caracteres');
    }

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar email automáticamente
    });

    if (authError) {
      throw new ValidationError(`Error en registro: ${authError.message}`);
    }

    if (!authData.user) {
      throw new ValidationError('Error creando usuario');
    }

    // Generar sesión usando signInWithPassword
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (sessionError || !sessionData.session) {
      throw new ValidationError('Error generando sesión');
    }

    const response: AuthResponse = {
      user: {
        id: authData.user.id,
        email: authData.user.email || '',
      },
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token || '',
        expires_in: sessionData.session.expires_in || 3600,
      },
    };

    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Iniciar sesión
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as LoginRequest;

    // Validar
    if (!email || !password) {
      throw new ValidationError('Email y password son requeridos');
    }

    // Autenticar con Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.session) {
      throw new ValidationError('Email o password incorrectos');
    }

    const response: AuthResponse = {
      user: {
        id: authData.user.id,
        email: authData.user.email || '',
      },
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token || '',
        expires_in: authData.session.expires_in || 3600,
      },
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/refresh
 * Renovar token expirado
 */
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      throw new ValidationError('refresh_token es requerido');
    }

    // Renovar sesión
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.refreshSession({
      refresh_token,
    });

    if (sessionError || !sessionData.session) {
      throw new ValidationError('Refresh token inválido o expirado');
    }

    res.json({
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token || '',
      expires_in: sessionData.session.expires_in || 3600,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
