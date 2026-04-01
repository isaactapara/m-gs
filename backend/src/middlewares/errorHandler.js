const logger = require('../core/logger');
const AppError = require('../core/appError');
const { env } = require('../config/env');

const notFoundHandler = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND'));
};

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const isOperational = err instanceof AppError || err.isOperational;

  logger.error('request_failed', {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    code,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: isOperational ? err.message : 'Internal Server Error',
      details: err.details || null,
      requestId: req.requestId,
    },
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
