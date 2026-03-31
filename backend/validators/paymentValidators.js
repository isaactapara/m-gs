const { body } = require('express-validator');

const stkPushValidators = [
  body('phone')
    .trim()
    .matches(/^(\+?254|0)\d{9}$/)
    .withMessage('Phone must be a valid Kenyan mobile number'),
  body('amount')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Amount must be a positive number'),
  body('billId')
    .isUUID()
    .withMessage('billId must be a valid UUID'),
];

const statusCheckValidators = [
  body('billId')
    .isUUID()
    .withMessage('billId must be a valid UUID'),
];


module.exports = {
  stkPushValidators,
  statusCheckValidators,
};
