const { param } = require('express-validator');

const mongoIdParam = (name = 'id') => param(name).isMongoId().withMessage(`${name} must be a valid MongoDB ObjectId`);

module.exports = {
  mongoIdParam,
};
