import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import config from './config.js';
import client from './db/client.js';
import { initSchema } from './db/schema.js';
import { seedDatabase } from './db/seed.js';

// Route imports
import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import examinationRoutes from './routes/examinations.js';
import prescriptionRoutes from './routes/prescriptions.js';
import medicationRoutes from './routes/medications.js';
import appointmentRoutes from './routes/appointments.js';
import drugRoutes from './routes/drugs.js';
import auditRoutes from './routes/audit.js';
import analyticsRoutes from './routes/analytics.js';

const app = express();

// ── Security & parsing ──────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Trust proxy so req.ip is accurate behind reverse proxies
app.set('trust proxy', 1);

// Rate limiter: 200 requests per minute per IP
app.use('/api/', rateLimit({
  windowMs: 60_000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
}));

// Stricter limit on auth endpoints
app.use('/api/auth/', rateLimit({
  windowMs: 60_000,
  max: 20,
  message: { error: 'Too many auth attempts, please try again later' },
}));

// ── Routes ──────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/patients/:id/examinations', examinationRoutes);
app.use('/api/patients/:id/prescriptions', prescriptionRoutes);
app.use('/api/patients/:id/medications', medicationRoutes);
app.use('/api/patients/:id/audit', auditRoutes);
app.use('/api/drugs', drugRoutes);
app.use('/api/analytics', analyticsRoutes);

// Appointments have a non-standard mount — the router handles its own sub-paths
app.use('/api', appointmentRoutes);

// Drug interaction check is mounted under patients in the drugs router
// /api/patients/:patientId/interaction-check is handled by drugRoutes

// ── Health check ────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── 404 catch-all ───────────────────────────────────────────────
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ── Global error handler ────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[error]', err.message, err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Startup ─────────────────────────────────────────────────────
async function start() {
  try {
    console.log('[init] Initializing Cassandra schema...');
    await initSchema();

    console.log('[init] Connecting Cassandra client...');
    await client.connect();

    await seedDatabase(client);

    app.listen(config.port, () => {
      console.log(`[server] MediLog API running on http://localhost:${config.port}`);
    });
  } catch (err) {
    console.error('[fatal] Failed to start:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[shutdown] Closing Cassandra connection...');
  await client.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await client.shutdown();
  process.exit(0);
});

start();
