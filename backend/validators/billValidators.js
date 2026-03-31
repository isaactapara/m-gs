const { body } = require('express-validator');
const { mongoIdParam } = require('./commonValidators');

const billItemRule = body('items')
  .isArray({ min: 1 })
  .withMessage('At least one bill item is required');

const itemDetailsRules = [
  body('items.*.name')
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('Each item must include a valid name'),
  body('items.*.price')
    .isFloat({ min: 0 })
    .withMessage('Each item must include a valid price'),
  body('items.*.quantity')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Each item must include a valid quantity'),
];

const createBillValidators = [
  billItemRule,
  ...itemDetailsRules,
  body('paymentMethod')
    .isIn(['M-Pesa', 'Cash'])
    .withMessage('paymentMethod must be M-Pesa or Cash'),
  body('status')
    .optional()
    .isIn(['PAID', 'PENDING', 'FAILED', 'CANCELLED', 'PARTIAL_PAYMENT_FLAGGED', 'CONFIRMED'])
    .withMessage('Invalid bill status'),
];

const updateBillStatusValidators = [
  mongoIdParam('id'),
  body('status')
    .isIn(['PAID', 'PENDING', 'FAILED', 'CANCELLED', 'PARTIAL_PAYMENT_FLAGGED', 'CONFIRMED'])
    .withMessage('Invalid bill status'),
  body('paymentMethod')
    .optional()
    .isIn(['M-Pesa', 'Cash'])
    .withMessage('paymentMethod must be M-Pesa or Cash'),
];

const billIdValidators = [
  mongoIdParam('id'),
];

module.exports = {
  createBillValidators,
  updateBillStatusValidators,
  billIdValidators,
};
