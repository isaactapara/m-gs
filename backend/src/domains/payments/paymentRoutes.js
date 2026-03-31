const express = require('express');
const {
  initiateSTKPush,
  handleCallback,
  checkTransactionStatus,
} = require('./paymentController');
const { protect } = require('../../middlewares/auth');
const validateRequest = require('../../middlewares/validateRequest');
const { paymentLimiter } = require('../../middlewares/rateLimiters');
const {
  stkPushValidators,
  statusCheckValidators,
} = require('../../../validators/paymentValidators');

const router = express.Router();

router.post('/stk-push', protect, paymentLimiter, stkPushValidators, validateRequest, initiateSTKPush);
router.post('/check-status', protect, paymentLimiter, statusCheckValidators, validateRequest, checkTransactionStatus);
router.post('/callback', handleCallback);

module.exports = router;
