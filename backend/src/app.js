require('dotenv').config();

const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const bootstrapAdmin = require('./utils/bootstrapAdmin');
const recalculateScores = require('./utils/recalculateScores');
const { initRealtime } = require('./realtime');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const challengeRoutes = require('./routes/challenges');
const profileRoutes = require('./routes/profile');
const leaderboardRoutes = require('./routes/leaderboard');
const ticketRoutes = require('./routes/tickets');

const app = express();

const uploadsDir = path.join(process.cwd(), 'uploads', 'challenges');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const allowedOrigins = String(process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ctf-platform-backend'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/tickets', ticketRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

app.use((error, _req, res, _next) => {
  console.error(error);

  if (error.name === 'MulterError') {
    return res.status(400).json({
      message: error.message
    });
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation failed.',
      errors: error.errors
    });
  }

  return res.status(500).json({
    message: error.message || 'Internal server error.'
  });
});

const port = Number(process.env.PORT || 5000);
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

initRealtime(io);

async function start() {
  await connectDB();
  await bootstrapAdmin();

  if (String(process.env.AUTO_RECALC_SCORES_ON_BOOT || '').toLowerCase() === 'true') {
    const summary = await recalculateScores();
    console.log('Score recalculation on boot:', summary);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
