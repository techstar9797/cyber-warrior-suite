import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import incidentsRouter from './api/incidents';
import assetsRouter from './api/assets';
import rulesRouter from './api/rules';
import slackRouter from './api/slack';
import agentRunsRouter from './api/agent-runs';
import ingestRouter from './api/ingest';
// import aiRouter from './api/ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/incidents', incidentsRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/rules', rulesRouter);
app.use('/api/slack', slackRouter);
app.use('/api/agent-runs', agentRunsRouter);
app.use('/api/ingest', ingestRouter);
// app.use('/api/ai', aiRouter);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend API server running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});

export default app;
