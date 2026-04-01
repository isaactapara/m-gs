// Triggered config reload: 2026-03-31T21:17:00
const { assertRequiredConfig, env } = require('./config/env');
const logger = require('./core/logger');
const createApp = require('./app');

assertRequiredConfig();

const app = createApp();



const { warmupCache } = require('./domains/menu/menuController');

const startServer = async () => {
  const server = app.listen(env.port, () => {
    logger.info('server_started', {
      port: env.port,
      nodeEnv: env.nodeEnv,
    });

    // Background Tasks
    warmupCache();
  });

  server.on('error', (error) => {
    logger.error('server_runtime_error', { message: error.message });
  });
};

startServer().catch((error) => {
  logger.error('server_boot_failed', { message: error.message });
  process.exit(1);
});


