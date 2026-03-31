// Triggered config reload: 2026-03-31T21:17:00
const { assertRequiredConfig, env } = require('./config/env');
const logger = require('./core/logger');
const createApp = require('./app');
const { reconcilePendingTransactions } = require('./domains/payments/paymentReconciliationService');

assertRequiredConfig();

const app = createApp();

const checkCallbackConfig = () => {
  if (env.nodeEnv === 'development' && !process.env.MPESA_CALLBACK_URL) {
    logger.warn('mpesa_callback_url_missing', {
      message: 'MPESA_CALLBACK_URL is not set. M-Pesa payments will not be automatically confirmed. Please start a tunnel (e.g., cloudflared) and update your .env.',
    });
  }
};


const { warmupCache } = require('./domains/menu/menuController');

const startServer = async () => {
  app.listen(env.port, async () => {
    logger.info('server_started', {
      port: env.port,
      nodeEnv: env.nodeEnv,
    });

    // Background Tasks (Non-blocking)
    warmupCache();
    checkCallbackConfig();


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
