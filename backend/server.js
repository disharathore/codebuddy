import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { dbGet, initDb } from './db/database.js';
import problemsRouter  from './routes/problems.js';
import sessionsRouter  from './routes/sessions.js';
import hintsRouter     from './routes/hints.js';
import executeRouter   from './routes/execute.js';
import analyticsRouter from './routes/analytics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;
const defaultOrigins = ['http://localhost:5173', 'http://localhost:3000'];

function getAllowedOrigins() {
  const configured = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  return configured.length > 0 ? configured : defaultOrigins;
}

const allowedOrigins = getAllowedOrigins();

app.set('trust proxy', 1);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '100kb' }));

app.use((req, res, next) => {
  const requestId = randomUUID();
  const start = Date.now();

  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const baseLog = `[${new Date().toISOString()}] [${requestId}] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`;
    if (res.statusCode >= 500) {
      console.error(baseLog);
    } else {
      console.log(baseLog);
    }
  });

  next();
});

const apiLimiter     = rateLimit({ windowMs: 15*60*1000, max: 300, message: { success:false, error:'Too many requests' } });
const hintLimiter    = rateLimit({ windowMs: 60*1000,    max: 15,  message: { success:false, error:'Slow down on hints' } });
const executeLimiter = rateLimit({ windowMs: 60*1000,    max: 30,  message: { success:false, error:'Too many executions' } });

app.use('/api', apiLimiter);
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: process.env.NODE_ENV || 'development',
    time: new Date().toISOString(),
    request_id: req.id
  });
});

app.get('/health/live', (req, res) => {
  res.json({
    status: 'alive',
    time: new Date().toISOString(),
    request_id: req.id
  });
});

app.get('/health/ready', (req, res) => {
  const checks = {
    database: false,
    gemini_key: Boolean(process.env.GEMINI_API_KEY)
  };

  try {
    const row = dbGet('SELECT 1 as ok');
    checks.database = row?.ok === 1;
  } catch {
    checks.database = false;
  }

  const ready = checks.database && checks.gemini_key;
  const statusCode = ready ? 200 : 503;

  res.status(statusCode).json({
    status: ready ? 'ready' : 'not_ready',
    checks,
    time: new Date().toISOString(),
    request_id: req.id
  });
});

app.use('/api/problems',  problemsRouter);
app.use('/api/sessions',  sessionsRouter);
app.use('/api/hints',     hintLimiter, hintsRouter);
app.use('/api/execute',   executeLimiter, executeRouter);
app.use('/api/analytics', analyticsRouter);

app.use((req, res) => res.status(404).json({ success: false, error: 'Route not found' }));
app.use((err, req, res, next) => {
  const requestId = req?.id || 'n/a';
  console.error(`[${new Date().toISOString()}] [${requestId}] Unhandled error`, {
    message: err?.message,
    stack: err?.stack,
    method: req?.method,
    url: req?.originalUrl
  });
  res.status(500).json({ success: false, error: 'Internal server error', request_id: requestId });
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 CodeBuddy API → http://localhost:${PORT}`);
    console.log(`📊 Health check  → http://localhost:${PORT}/health`);
    console.log(`🌐 CORS origins  → ${allowedOrigins.join(', ')}`);
    console.log(`🔑 Gemini key    → ${process.env.GEMINI_API_KEY ? '✅ configured' : '❌ MISSING — add to .env!'}\n`);
  });
}).catch(err => {
  console.error('❌ DB init failed:', err.message);
  process.exit(1);
});
