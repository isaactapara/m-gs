const { env } = require('../../config/env');

const PAYMENT_METHODS = Object.freeze({
  MPESA: 'M-Pesa',
  CASH: 'Cash',
});

const PAYMENT_METHOD_MAP = Object.freeze({
  'M-Pesa': 'MPESA',
  'Cash': 'CASH',
  'MPESA': 'MPESA',
  'CASH': 'CASH',
  'm-pesa': 'MPESA',
  'cash': 'CASH',
});

const PAYMENT_STATUSES = Object.freeze({
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PAID: 'PAID',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
});

const PAYMENT_STATUS_MAP = Object.freeze({
  'Pending': 'PENDING',
  'Confirmed': 'CONFIRMED',
  'Paid': 'PAID',
  'Failed': 'FAILED',
  'Cancelled': 'CANCELLED',
  'PENDING': 'PENDING',
  'CONFIRMED': 'CONFIRMED',
  'PAID': 'PAID',
  'FAILED': 'FAILED',
  'CANCELLED': 'CANCELLED',
});

module.exports = {
  PAYMENT_METHODS,
  PAYMENT_METHOD_MAP,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_MAP,
};

