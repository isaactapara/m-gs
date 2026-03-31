const { env } = require('../../config/env');

const PAYMENT_METHODS = Object.freeze({
  MPESA: 'M-Pesa',
  CASH: 'Cash',
});

const PAYMENT_STATUSES = Object.freeze({
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PAID: 'PAID',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  PARTIAL_PAYMENT_FLAGGED: 'PARTIAL_PAYMENT_FLAGGED',
});

const TERMINAL_PAYMENT_STATUSES = Object.freeze([
  PAYMENT_STATUSES.PAID,
  PAYMENT_STATUSES.FAILED,
  PAYMENT_STATUSES.CANCELLED,
  PAYMENT_STATUSES.PARTIAL_PAYMENT_FLAGGED,
]);

const ACTIVE_PAYMENT_STATUSES = Object.freeze([
  PAYMENT_STATUSES.PENDING,
  PAYMENT_STATUSES.CONFIRMED,
]);

const MPESA_RESULT_CODES = Object.freeze({
  SUCCESS: '0',
});

const MPESA_TERMINAL_QUERY_FAILURE_CODES = Object.freeze([
  '1',
  '1032',
  '1019',
  '1031',
  '2001',
  '9999',
]);

const PAYMENT_AUDIT_FLAGS = Object.freeze({
  PAYMENT_ANOMALY: 'PAYMENT_ANOMALY',
  RECEIPT_COLLISION: 'RECEIPT_COLLISION',
});

const PAYMENT_WINDOWS = Object.freeze({
  REQUEST_TIMEOUT_MS: env.mpesaRequestTimeoutMs,
  DUPLICATE_WINDOW_MS: env.mpesaDuplicateWindowMs,
  CALLBACK_PROCESSING_LOCK_MS: Math.max(env.mpesaRequestTimeoutMs, 30000),
  RECONCILIATION_LOOKBACK_MS: env.reconciliationLookbackMs,
  RECONCILIATION_INTERVAL_MS: env.reconciliationIntervalMs,
});

const isTerminalPaymentStatus = (status) => TERMINAL_PAYMENT_STATUSES.includes(status);
const isActivePaymentStatus = (status) => ACTIVE_PAYMENT_STATUSES.includes(status);

module.exports = {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  TERMINAL_PAYMENT_STATUSES,
  ACTIVE_PAYMENT_STATUSES,
  MPESA_RESULT_CODES,
  MPESA_TERMINAL_QUERY_FAILURE_CODES,
  PAYMENT_AUDIT_FLAGS,
  PAYMENT_WINDOWS,
  isTerminalPaymentStatus,
  isActivePaymentStatus,
};
