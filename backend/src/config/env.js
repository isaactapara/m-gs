require('dotenv').config();

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toList = (value) => String(value || '')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 5000),
  databaseUrl: process.env.DATABASE_URL || '',
  directUrl: process.env.DIRECT_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  mpesaCallbackUrl: process.env.MPESA_CALLBACK_URL || '',
  corsAllowedOrigins: toList(process.env.CORS_ALLOWED_ORIGINS),
};

const assertRequiredConfig = () => {
  const isDev = env.nodeEnv === 'development' || env.nodeEnv === 'test';
  const minSecretLength = isDev ? 4 : 10;

  if (!env.jwtSecret || env.jwtSecret.trim().length < minSecretLength) {
    throw new Error(`FATAL: JWT_SECRET is missing or too weak (min ${minSecretLength} chars). Set JWT_SECRET in the backend environment.`);
  }

  if (!env.databaseUrl || !env.databaseUrl.trim()) {
    throw new Error('FATAL: DATABASE_URL is missing. Set DATABASE_URL for the PostgreSQL connection.');
  }
};

module.exports = {
  env,
  assertRequiredConfig,
};
