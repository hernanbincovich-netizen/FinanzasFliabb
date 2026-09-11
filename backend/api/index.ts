import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { verifyAuth } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errors.js';
import authRouter from './routes/auth.js';
import periodosRouter from './routes/periodos.js';
import movimientosRouter from './routes/movimientos.js';
import conceptosRouter from './routes/conceptos.js';

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
app.use('/api/auth', authRouter);

// Protected routes (requieren JWT)
app.use('/api', verifyAuth);

// Routers protegidos
app.use('/api/periodos', periodosRouter);
app.use('/api/movimientos', movimientosRouter);
app.use('/api/conceptos', conceptosRouter);

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
