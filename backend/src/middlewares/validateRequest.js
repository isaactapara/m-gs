const { validationResult } = require('express-validator');
const AppError = require('../core/appError');

const validateRequest = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) {
    return next();
  }

  const details = result.array().map((issue) => ({
    field: issue.path,
    message: issue.msg,
    value: issue.value,
  }));

  next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', details));
};

module.exports = validateRequest;
