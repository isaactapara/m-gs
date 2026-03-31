const { body } = require('express-validator');

const updateFloorPlanValidators = [
  body('tables')
    .isArray({ min: 1 })
    .withMessage('tables must be a non-empty array'),
  body('tables.*.tableId')
    .trim()
    .notEmpty()
    .withMessage('Each table must include tableId'),
  body('tables.*.name')
    .trim()
    .isLength({ min: 1, max: 80 })
    .withMessage('Each table must include a valid name'),
  body('tables.*.status')
    .isIn(['FREE', 'OCCUPIED', 'PENDING'])
    .withMessage('Each table must have a valid status'),
  body('tables.*.position.x')
    .isFloat({ min: 0 })
    .withMessage('Each table position.x must be a positive number'),
  body('tables.*.position.y')
    .isFloat({ min: 0 })
    .withMessage('Each table position.y must be a positive number'),
];

module.exports = {
  updateFloorPlanValidators,
};
