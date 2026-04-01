const { body, param } = require('express-validator');
const { PAYMENT_METHOD_MAP, PAYMENT_STATUS_MAP } = require('../src/core/constants/paymentConstants');

const createBillValidators = [
  body('items')
    .isArray({ min: 1, max: 50 })
    .withMessage('At least one item is required and max 50'),
  body('items.*.name')
    .trim()
    .notEmpty()
    .withMessage('Item name is required'),
  body('items.*.price')
    .isFloat({ min: 0 })
    .withMessage('Item price must be a non-negative number'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Item quantity must be at least 1'),
  body('paymentMethod')
    .optional()
    .custom((value) => {
      if (value && !PAYMENT_METHOD_MAP[value]) {
        throw new Error('Invalid payment method');
      }
      return true;
    }),
  body('status')
    .optional()
    .custom((value) => {
      if (value && !PAYMENT_STATUS_MAP[value]) {
        throw new Error('Invalid status');
      }
      return true;
    }),
];

const updateBillStatusValidators = [
  body('status')
    .optional()
    .custom((value) => {
      if (value && !PAYMENT_STATUS_MAP[value]) {
        throw new Error('Invalid status');
      }
      return true;
    }),
  body('paymentMethod')
    .optional()
    .custom((value) => {
      if (value && !PAYMENT_METHOD_MAP[value]) {
        throw new Error('Invalid payment method');
      }
      return true;
    }),
];

const billIdValidators = [
  param('id')
    .isUUID()
    .withMessage('Invalid bill ID format'),
];

module.exports = {
  createBillValidators,
  updateBillStatusValidators,
  billIdValidators,
};