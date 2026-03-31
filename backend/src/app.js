const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const requestContext = require('./middlewares/requestContext');
const { globalLimiter } = require('./middlewares/rateLimiters');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');

const createApp = () => {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(requestContext);
  app.use((req, res, next) => (
    req.path.startsWith('/api/payments/callback')
      ? next()
      : globalLimiter(req, res, next)
  ));

  app.use('/api/auth', require('./domains/auth/authRoutes'));
  app.use('/api/menu', require('./domains/menu/menuRoutes'));
  app.use('/api/bills', require('./domains/billing/billRoutes'));
  app.use('/api/payments', require('./domains/payments/paymentRoutes'));
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
