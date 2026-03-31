const { body } = require('express-validator');
const { mongoIdParam } = require('./commonValidators');

const usernameRule = body('username')
  .trim()
  .isLength({ min: 3, max: 40 })
  .withMessage('Username must be between 3 and 40 characters')
  .matches(/^[a-zA-Z0-9._-]+$/)
  .withMessage('Username may only contain letters, numbers, dots, underscores, or hyphens');

const pinRule = body('pin')
  .isString()
  .withMessage('PIN is required')
  .matches(/^\d{4,8}$/)
  .withMessage('PIN must be 4 to 8 digits');

const loginValidators = [
  usernameRule,
  pinRule,
];

const registerValidators = [
  usernameRule,
  pinRule,
  body('role')
    .optional()
    .isIn(['owner', 'cashier'])
    .withMessage('Role must be owner or cashier'),
];

const deleteUserValidators = [
  mongoIdParam('id'),
];

module.exports = {
  loginValidators,
  registerValidators,
  deleteUserValidators,
};
