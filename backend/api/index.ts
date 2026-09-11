import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { verifyAuth } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errors.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes (sin protección)
app.post('/api/auth/register', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ message: 'Register endpoint not implemented yet' });
  } catch (err) {
    next(err);
  }
});

app.post('/api/auth/login', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ message: 'Login endpoint not implemented yet' });
  } catch (err) {
    next(err);
  }
});

// Protected routes (requieren JWT)
app.use('/api', verifyAuth);

// Periodos routes (stub)
app.get('/api/periodos', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ message: 'GET periodos not implemented yet', data: [] });
  } catch (err) {
    next(err);
  }
});

app.post('/api/periodos', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json({ message: 'POST periodos not implemented yet' });
  } catch (err) {
    next(err);
  }
});

// Movimientos routes (stub)
app.get('/api/periodos/:periodoId/movimientos', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ message: 'GET movimientos not implemented yet', data: [] });
  } catch (err) {
    next(err);
  }
});

// 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'not_found', message: 'Endpoint no existe' });
});

// Error handler
app.use(errorHandler);

// Start server (solo si no está en Vercel)
const port = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`🚀 Backend running on http://localhost:${port}`);
    console.log(`📍 Health check: GET http://localhost:${port}/api/health`);
  });
}

export default app;
