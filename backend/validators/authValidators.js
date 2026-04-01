const { body } = require('express-validator');
const { mongoIdParam } = require('./commonValidators');

const usernameRule = body('username')
  .trim()
  .isLength({ min: 3, max: 40 })
  .withMessage('Username must be between 3 and 40 characters')
  .matches(/^[a-zA-Z0-9._-]+$/)
  .withMessage('Username may only contain letters, numbers, dots, underscores, or hyphens')
  .toLowerCase(); // Convert to lowercase for consistency

const passwordRule = body('password')
  .isString()
  .withMessage('PIN is required')
  .isLength({ min: 6, max: 6 })
  .withMessage('PIN must be exactly 6 digits')
  .isNumeric()
  .withMessage('PIN must contain only numbers');

const loginValidators = [
  usernameRule,
  passwordRule,
];


const registerValidators = [
  usernameRule,
  passwordRule,
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
