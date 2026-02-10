const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('../src/routes/auth');
const projectRoutes = require('../src/routes/projects');
const { router: logRoutes } = require('../src/routes/logs');
const folderRoutes = require('../src/routes/folders');
const auth = require('../src/middleware/auth');
const { connectToDatabase } = require('./_lib/db');

const app = express();

app.set('trust proxy', 1);

const corsOrigin = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:4200';
app.use(cors({ origin: corsOrigin }));
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many attempts. Please try again later.'
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/projects', auth, projectRoutes);
app.use('/api', auth, logRoutes);
app.use('/api', auth, folderRoutes);

module.exports = async (req, res) => {
  await connectToDatabase();
  return app(req, res);
};
