const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { env } = require('./config/env');
const requestContext = require('./middlewares/requestContext');
const { globalLimiter } = require('./middlewares/rateLimiters');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');
const AppError = require('./core/appError');
const logger = require('./core/logger');

const createApp = () => {
  const app = express();
  const defaultDevOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
  ];
  const allowedOrigins = new Set(
    env.corsAllowedOrigins.length ? env.corsAllowedOrigins : defaultDevOrigins
  );

  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({
    origin: (origin, callback) => {
      // Allow non-browser requests without Origin header (curl, server-to-server).
      if (!origin) {
        callback(null, true);
        return;
      }

      // Exact match for configured origins
      if (allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      // Robust development check: allow localhost and 127.0.0.1 on any port
      if (env.nodeEnv === 'development') {
        const url = new URL(origin);
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
          callback(null, true);
          return;
        }
      }

      logger.security('cors_origin_rejected', { origin });
      callback(new AppError(`Origin ${origin} not allowed by CORS policy`, 403, 'CORS_ORIGIN_BLOCKED'));
    },
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    maxAge: 600,
  }));
  app.use(express.json({
    limit: '1mb',
    verify: (req, res, buf) => {
      req.rawBody = Buffer.from(buf);
    },
  }));
  app.use(requestContext);
  app.use(globalLimiter);

  app.use('/api/auth', require('./domains/auth/authRoutes'));
  app.use('/api/menu', require('./domains/menu/menuRoutes'));
  app.use('/api/bills', require('./domains/billing/billRoutes'));
  app.use('/api/settings', require('./domains/sharedState/settingsRoutes'));
  app.use('/api/tables', require('./domains/sharedState/tableRoutes'));
  app.use('/api/reports', require('./domains/reports/reportRoutes'));

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.get('/', (req, res) => {
    res.json({ message: 'M&G Restaurant Hub API is Live' });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
