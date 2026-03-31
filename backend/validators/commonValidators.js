const { param } = require('express-validator');

const mongoIdParam = (name = 'id') => param(name).isUUID().withMessage(`${name} must be a valid ID`);


module.exports = {
  mongoIdParam,
};
