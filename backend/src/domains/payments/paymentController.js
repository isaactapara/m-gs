const asyncHandler = require('../../core/asyncHandler');
const logger = require('../../core/logger');
const {
  initiatePayment,
  checkPaymentStatus,
  processCallbackAsync,
  acknowledgeCallback,
} = require('./paymentReconciliationService');
const { mapBillForFrontend } = require('../billing/billController');

const mapPaymentResult = (result) => {
  if (result && result.bill) {
    result.bill = mapBillForFrontend(result.bill);
  }
  return result;
};

const initiateSTKPush = asyncHandler(async (req, res) => {
  const result = await initiatePayment({
    req,
    billId: req.body.billId,
    phone: req.body.phone,
  });

  res.json(mapPaymentResult(result));
});

const checkTransactionStatus = asyncHandler(async (req, res) => {
  const result = await checkPaymentStatus({
    req,
    billId: req.body.billId,
  });

  res.json(mapPaymentResult(result));
});

const handleCallback = asyncHandler(async (req, res) => {
  const payload = req.body;
  const requestMeta = {
    requestId: req.requestId,
    ip: req.ip,
  };

  const acknowledgement = acknowledgeCallback({
    headers: req.headers,
    payload,
  });

  setImmediate(async () => {
    try {
      await processCallbackAsync({
        payload,
        requestMeta,
      });
    } catch (error) {
      logger.error('mpesa_callback_processing_failed', {
        requestId: req.requestId,
        message: error.message,
      });
    }
  });

  res.status(200).json(acknowledgement);
});

module.exports = {
  initiateSTKPush,
  checkTransactionStatus,
  handleCallback,
};
