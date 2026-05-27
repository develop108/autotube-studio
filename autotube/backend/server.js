require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

// Routes
const authRoutes = require('./routes/auth');
const channelRoutes = require('./routes/channels');
const pipelineRoutes = require('./routes/pipeline');
const integrationRoutes = require('./routes/integrations');
const videoRoutes = require('./routes/videos');

// DB init
const { initDB } = require('./utils/db');

const app = express();
const server = http.createServer(app);

// ── WebSocket (for real-time pipeline progress) ──
const wss = new WebSocket.Server({ server, path: '/ws' });
const clients = new Map(); // userId -> ws

wss.on('connection', (ws, req) => {
  const userId = new URL(req.url, 'http://localhost').searchParams.get('userId') || 'anon';
  clients.set(userId, ws);
  ws.on('close', () => clients.delete(userId));
  ws.send(JSON.stringify({ type: 'connected', message: 'Pipeline socket ready' }));
});

// Export broadcaster for use in pipeline service
global.broadcastProgress = (userId, data) => {
  const ws = clients.get(String(userId));
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
};

// ── Middleware ──
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });
app.use('/api/', limiter);
app.use('/api/pipeline', apiLimiter);

// Static file serving (outputs & uploads)
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const outputDir = process.env.OUTPUT_DIR || './outputs';
[uploadDir, outputDir, './data'].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});
app.use('/uploads', express.static(path.resolve(uploadDir)));
app.use('/outputs', express.static(path.resolve(outputDir)));

// Serve frontend build (if exists)
const frontendBuild = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendBuild)) {
  app.use(express.static(frontendBuild));
}

// ── API Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/videos', videoRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// SPA fallback
app.get('*', (req, res) => {
  if (fs.existsSync(frontendBuild)) {
    res.sendFile(path.join(frontendBuild, 'index.html'));
  } else {
    res.json({ message: 'AutoTube API running. Frontend not built yet.' });
  }
});

// ── Start ──
const PORT = process.env.PORT || 3001;
initDB().then(() => {
  server.listen(PORT, () => {
    console.log(`✅ AutoTube Server running on port ${PORT}`);
    console.log(`📡 WebSocket ready at ws://localhost:${PORT}/ws`);
  });
}).catch(err => {
  console.error('❌ DB init failed:', err);
  process.exit(1);
});
