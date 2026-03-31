const { assertRequiredConfig, env } = require('./config/env');
const logger = require('./core/logger');
const createApp = require('./app');
const { reconcilePendingTransactions } = require('./domains/payments/paymentReconciliationService');

assertRequiredConfig();

const app = createApp();

const startLocalTunnel = async () => {
  if (env.nodeEnv !== 'development') {
    return;
  }

  try {
    const localtunnel = require('localtunnel');
    const tunnel = await localtunnel({ port: env.port });
    process.env.MPESA_CALLBACK_URL = `${tunnel.url}/api/payments/callback`;

    logger.info('localtunnel_started', {
      url: tunnel.url,
      callbackUrl: process.env.MPESA_CALLBACK_URL,
    });

    tunnel.on('close', () => logger.warn('localtunnel_closed'));
  } catch (error) {
    logger.error('localtunnel_failed', { message: error.message });
  }
};

const { warmupCache } = require('./domains/menu/menuController');

const startServer = async () => {
  app.listen(env.port, async () => {
    logger.info('server_started', {
      port: env.port,
      nodeEnv: env.nodeEnv,
    });

    // Background Warmup (Non-blocking)
    warmupCache();
    startLocalTunnel();

    setInterval(async () => {

      try {
        const reconciled = await reconcilePendingTransactions();
        if (reconciled > 0) {
          logger.info('payment_reconciliation_cycle_completed', { reconciled });
        }
      } catch (error) {
        logger.error('payment_reconciliation_cycle_failed', { message: error.message });
      }
    }, env.reconciliationIntervalMs);
  });
};

startServer().catch((error) => {
  logger.error('server_boot_failed', { message: error.message });
  process.exit(1);
});
