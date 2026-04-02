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
  .withMessage('Password is required')
  .isLength({ min: 6 })
  .withMessage('Password must be at least 6 characters long');

const loginValidators = [
  usernameRule,
  passwordRule,
];


const registerValidators = [
  usernameRule,
  passwordRule,
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
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
