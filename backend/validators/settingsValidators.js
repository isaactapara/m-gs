const { body } = require('express-validator');

const updateSettingsValidators = [
  body('restaurantName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('restaurantName must be between 2 and 120 characters'),
  body('currency')
    .optional()
    .trim()
    .isLength({ min: 2, max: 10 })
    .withMessage('currency must be between 2 and 10 characters'),
  body('timezone')
    .optional()
    .trim()
    .isLength({ min: 3, max: 60 })
    .withMessage('timezone must be between 3 and 60 characters'),
];

module.exports = {
  updateSettingsValidators,
};
