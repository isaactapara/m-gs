const SENSITIVE_KEYS = new Set([
  'authorization',
  'token',
  'jwt',
  'pin',
  'password',
  'passkey',
  'consumerSecret',
  'mpesaConsumerSecret',
  'mpesaPasskey',
]);

const redactValue = (value) => {
  if (value == null) return value;
  if (typeof value === 'string') {
    if (value.length <= 8) return '***';
    return `${value.slice(0, 3)}***${value.slice(-2)}`;
  }

  return '***';
};

const sanitize = (input) => {
  if (Array.isArray(input)) {
    return input.map((item) => sanitize(item));
  }

  if (input && typeof input === 'object') {
    return Object.entries(input).reduce((acc, [key, value]) => {
      acc[key] = SENSITIVE_KEYS.has(key) ? redactValue(value) : sanitize(value);
      return acc;
    }, {});
  }

  return input;
};

const write = (level, event, payload = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...sanitize(payload),
  };

  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.log(line);
};

module.exports = {
  info: (event, payload) => write('info', event, payload),
  warn: (event, payload) => write('warn', event, payload),
  error: (event, payload) => write('error', event, payload),
  audit: (event, payload) => write('audit', event, payload),
  security: (event, payload) => write('security', event, payload),
};
