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
      // 1. Allow non-browser requests (e.g. server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      // 2. Exact match for configured allowed origins
      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      // 3. Dev-mode relaxation: Allow local traffic on any port
      if (env.nodeEnv === 'development') {
        try {
          const url = new URL(origin);
          if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
            return callback(null, true);
          }
        } catch (err) {
          logger.error('cors_origin_parse_error', { origin, error: err.message });
        }
      }

      // 4. Reject and log violation
      logger.security('cors_origin_rejected', { origin });
      return callback(null, false);
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
