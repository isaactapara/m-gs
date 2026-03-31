require('dotenv').config();

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 5000),
  databaseUrl: process.env.DATABASE_URL || '',
  directUrl: process.env.DIRECT_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  mpesaShortcode: process.env.MPESA_SHORTCODE || '',
  mpesaPasskey: process.env.MPESA_PASSKEY || '',
  mpesaConsumerKey: process.env.MPESA_CONSUMER_KEY || '',
  mpesaConsumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
  mpesaCallbackUrl: process.env.MPESA_CALLBACK_URL || '',
  mpesaCallbackSecret: process.env.MPESA_CALLBACK_SECRET || '',
  mpesaAmountTolerance: toInt(process.env.MPESA_AMOUNT_TOLERANCE, 1),
  mpesaRequestTimeoutMs: toInt(process.env.MPESA_REQUEST_TIMEOUT_MS, 45000),
  mpesaDuplicateWindowMs: toInt(process.env.MPESA_DUPLICATE_WINDOW_MS, 60000),
  reconciliationLookbackMs: toInt(process.env.MPESA_RECONCILIATION_LOOKBACK_MS, 10 * 60 * 1000),
  reconciliationBatchSize: toInt(process.env.MPESA_RECONCILIATION_BATCH_SIZE, 25),
  reconciliationIntervalMs: toInt(process.env.MPESA_RECONCILIATION_INTERVAL_MS, 3 * 60 * 1000),
};

const assertRequiredConfig = () => {
  if (!env.jwtSecret || env.jwtSecret.trim().length < 10) {
    throw new Error('FATAL: JWT_SECRET is missing or too weak. Set JWT_SECRET in the backend environment.');
  }

  if (!env.databaseUrl || !env.databaseUrl.trim()) {
    throw new Error('FATAL: DATABASE_URL is missing. Set DATABASE_URL for the PostgreSQL connection.');
  }
};

module.exports = {
  env,
  assertRequiredConfig,
};
