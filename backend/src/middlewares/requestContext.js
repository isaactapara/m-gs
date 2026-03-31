const crypto = require('crypto');
const logger = require('../core/logger');

const requestContext = (req, res, next) => {
  req.requestId = req.headers['x-request-id'] || crypto.randomUUID();

  res.setHeader('x-request-id', req.requestId);

  logger.info('request_started', {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
  });

  res.on('finish', () => {
    logger.info('request_finished', {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
    });
  });

  next();
};

module.exports = requestContext;
