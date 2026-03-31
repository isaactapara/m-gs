const { body } = require('express-validator');
const { mongoIdParam } = require('./commonValidators');

const categoryRule = body('category')
  .isIn(['Mains', 'Snacks', 'Hot Beverages', 'Sides', 'Drinks', 'Staples', 'Vegetables'])
  .withMessage('Invalid menu category');

const addMenuItemValidators = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Item name must be between 2 and 120 characters'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  categoryRule,
];

const updateMenuItemValidators = [
  mongoIdParam('id'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Item name must be between 2 and 120 characters'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('category')
    .optional()
    .isIn(['Mains', 'Snacks', 'Hot Beverages', 'Sides', 'Drinks', 'Staples', 'Vegetables'])
    .withMessage('Invalid menu category'),
];

const deleteMenuItemValidators = [
  mongoIdParam('id'),
];

module.exports = {
  addMenuItemValidators,
  updateMenuItemValidators,
  deleteMenuItemValidators,
};
