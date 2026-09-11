import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  errorCode?: string;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || 'internal_error';

  console.error(`[${statusCode}] ${errorCode}:`, err.message);

  res.status(statusCode).json({
    error: errorCode,
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

// Helper para crear errores
export class ValidationError extends Error implements AppError {
  statusCode = 400;
  errorCode = 'validation_error';

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error implements AppError {
  statusCode = 404;
  errorCode = 'not_found';

  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class AuthError extends Error implements AppError {
  statusCode = 401;
  errorCode = 'unauthorized';

  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class ConflictError extends Error implements AppError {
  statusCode = 409;
  errorCode = 'conflict';

  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}
