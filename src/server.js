require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const { router: logRoutes } = require('./routes/logs');
const folderRoutes = require('./routes/folders');
const auth = require('./middleware/auth');

const app = express();
// Deployment marker: server.js updated

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

const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/site-tracker';

mongoose
  .connect(mongoUri)
  .then(() => {
    app.listen(port, () => {
      console.log(`API running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });
