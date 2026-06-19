import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import pool from './config/db';
import reportsRouter from './routes/reports';
import missionsRouter from './routes/missions';
import operatorsRouter from './routes/operators';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Host static uploaded evidence files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: '*', // Adjust to specific frontend host in production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Tactical Logger - Clean & Anonymous
app.use((req: Request, res: Response, next: NextFunction) => {
  // IP scrubbed for operator safety in production.
  console.log(`[OPERATOR REQUEST] [${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Mount Active Channels
app.use('/api/reports', reportsRouter);
app.use('/api/missions', missionsRouter);
app.use('/api/operators', operatorsRouter);

// Health check endpoint
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const dbCheck = await pool.query('SELECT NOW()');
    res.status(200).json({
      status: 'operational',
      timestamp: new Date().toISOString(),
      database: 'connected',
      entropy: dbCheck.rows[0].now
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'degraded',
      error: error.message
    });
  }
});

// Root terminal index
app.get('/api', (req: Request, res: Response) => {
  res.status(200).json({
    message: "RUSSAW: Tactial Collective REST API Gateway v1.0.0",
    status: "authorized_access_only"
  });
});

// 404 Route
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "endpoint_not_found" });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[FATAL EXCEPTION]', err.stack);
  res.status(500).json({
    status: 'runtime_error',
    error: err.message || 'Internal Server Error'
  });
});

// Connect to DB and Start Listening
const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    console.log('[INIT] Database connection verified.');
    
    app.listen(PORT, () => {
      console.log(`[INIT] Operational Gateway active on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[FATAL INIT] Failed to verify database connection:', error);
    process.exit(1);
  }
};

startServer();
