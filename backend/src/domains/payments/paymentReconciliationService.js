const logger = require('../../core/logger');
const AppError = require('../../core/appError');
const {
  initiateStkPushRequest,
  queryStkStatusRequest,
  parseCallbackPayload,
  ensureCallbackAuthorized,
  extractIdFromText,
} = require('./mpesaService');
const {
  TERMINAL_STATUSES,
  getBillById,
  assertPaymentAccess,
  getActivePaymentAttempt,
  acquirePaymentLock,
  releasePaymentLock,
  linkCheckoutIdentifiers,
  findBillByIdentifiers,
  findBillByReceipt,
  findFuzzyPendingBill,
  claimCallbackProcessing,
  releaseCallbackProcessing,
  markPaymentSuccess,
  markPaymentConfirmed,
  markPaymentFailure,
  markPaymentAnomaly,
  updateLastStatusQueryAt,
  getReconciliationCandidates,
} = require('./paymentStateService');
const { auditPaymentAgainstBill } = require('./paymentAuditService');
const { recordAuditEvent } = require('../audit/auditLogService');
const {
  PAYMENT_STATUSES,
  MPESA_RESULT_CODES,
  MPESA_TERMINAL_QUERY_FAILURE_CODES,
  PAYMENT_AUDIT_FLAGS,
} = require('../../core/constants/paymentConstants');

const CALLBACK_ACTOR = Object.freeze({
  actorId: null,
  actorUsername: 'mpesa-callback',
  actorRole: 'system',
});

const isSuccessfulResultCode = (code) => String(code) === MPESA_RESULT_CODES.SUCCESS;

const buildIdempotentPaymentResponse = ({ bill, status, customerMessage }) => ({
  ResponseCode: MPESA_RESULT_CODES.SUCCESS,
  ResponseDescription: customerMessage,
  CustomerMessage: customerMessage,
  CheckoutRequestID: bill.checkoutRequestId || null,
  MerchantRequestID: bill.merchantRequestId || null,
  billId: String(bill.id),
  status,
  idempotent: true,
});

const linkIdentifiersSafely = async (billId, identifiers) => {
  try {
    return await linkCheckoutIdentifiers(billId, identifiers);
  } catch (error) {
    if (error?.code === 11000) {
      const existingBill = await findBillByIdentifiers(identifiers);
      if (existingBill && String(existingBill.id) === String(billId)) {
        return existingBill;
      }
    }

    throw error;
  }
};

const createReceiptCollisionReason = ({ receiptNumber, conflictingBill }) => (
  `Receipt collision detected: ${receiptNumber} already linked to bill ${conflictingBill.billNumber}`
);

const markReceiptCollisionAnomaly = async ({ bill, callback, conflictingBill, requestMeta }) => {
  const reason = createReceiptCollisionReason({
    receiptNumber: callback.mpesaReceipt,
    conflictingBill,
  });

  const anomalyBill = await markPaymentAnomaly(bill.id, {
    receiptNumber: callback.mpesaReceipt,
    amountPaid: callback.actualAmountPaid,
    amountDifference: Number(((callback.actualAmountPaid || 0) - bill.total).toFixed(2)),
    reason,
    auditFlag: PAYMENT_AUDIT_FLAGS.RECEIPT_COLLISION,
  });

  await recordAuditEvent({
    req: requestMeta,
    action: 'payment.receipt_collision',
    entityType: 'Bill',
    entityId: anomalyBill.id,
    status: 'WARNING',
    metadata: {
      billNumber: anomalyBill.billNumber,
      receipt: callback.mpesaReceipt,
      conflictingBillId: conflictingBill.id,
      conflictingBillNumber: conflictingBill.billNumber,
    },
    actor: CALLBACK_ACTOR,
  });

  return anomalyBill;
};

const persistSuccessfulPayment = async ({ bill, callback, requestMeta }) => {
  try {
    return await markPaymentSuccess(bill.id, {
      receiptNumber: callback.mpesaReceipt || bill.mpesaReceiptNumber,
      paymentPhone: callback.paymentPhone,
      amountPaid: callback.actualAmountPaid,
      mpesaTransactionDate: callback.mpesaTransactionDate,
      source: 'callback',
    });
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.mpesaReceiptNumber && callback.mpesaReceipt) {
      const conflictingBill = await findBillByReceipt(callback.mpesaReceipt);

      if (conflictingBill && String(conflictingBill.id) !== String(bill.id)) {
        return markReceiptCollisionAnomaly({
          bill,
          callback,
          conflictingBill,
          requestMeta,
        });
      }
    }

    throw error;
  }
};

const syncBillStatus = async (bill, req = null) => {
  if (!bill.checkoutRequestId) {
    if (TERMINAL_STATUSES.includes(bill.status)) {
      return { status: bill.status, bill };
    }

    throw new AppError('Transaction record not found', 404, 'PAYMENT_RECORD_NOT_FOUND');
  }

  if (TERMINAL_STATUSES.includes(bill.status)) {
    return { status: bill.status, bill };
  }
  
  if (bill.lastStatusQueryAt && Date.now() - new Date(bill.lastStatusQueryAt).getTime() < 15000) {
    return {
      status: bill.status,
      bill,
      message: 'Self-throttling active. Returning last known status.'
    };
  }

  // Prevent querying Safaricom status for the first 10 seconds after initiation.
  // The user likely hasn't even entered their PIN yet, and it avoids unnecessary "Spike Arrest" errors.
  const lastAttempt = bill.lastPaymentAttemptAt ? new Date(bill.lastPaymentAttemptAt).getTime() : 0;
  if (Date.now() - lastAttempt < 10000) {
    return {
      status: bill.status,
      bill,
      message: 'Processing initiation. Waiting for callback...'
    };
  }

  try {
    await updateLastStatusQueryAt(bill.id);
    const response = await queryStkStatusRequest(bill.checkoutRequestId);
    const resultCode = String(response.ResultCode ?? '');
    const resultDesc = response.ResultDesc || '';

    logger.info('mpesa_status_query_result', {
      requestId: req?.requestId,
      billId: bill.id,
      checkoutRequestId: bill.checkoutRequestId,
      resultCode,
      resultDesc,
    });

    if (isSuccessfulResultCode(resultCode)) {
      const receiptNumber = extractIdFromText(resultDesc);

      if (receiptNumber) {
        const updatedBill = await markPaymentSuccess(bill.id, {
          receiptNumber,
          source: 'query',
        });

        return {
          status: PAYMENT_STATUSES.PAID,
          bill: updatedBill,
        };
      }

      const updatedBill = await markPaymentConfirmed(bill.id);
      return {
        status: PAYMENT_STATUSES.CONFIRMED,
        bill: updatedBill,
      };
    }

    if (MPESA_TERMINAL_QUERY_FAILURE_CODES.includes(resultCode)) {
      const failedBill = await markPaymentFailure(
        bill.id,
        resultDesc || 'Payment failed',
        {
          source: 'query',
          resultCode: Number(response.ResultCode),
        }
      );

      return {
        status: PAYMENT_STATUSES.FAILED,
        bill: failedBill,
      };
    }

    return {
      status: PAYMENT_STATUSES.PENDING,
      bill,
      message: 'M-Pesa sync in progress...',
    };
  } catch (error) {
    const isRateLimit = error?.statusCode === 429 
      || error?.code === 'RATE_LIMIT' 
      || String(error?.message).includes('429')
      || String(error?.message).includes('Spike arrest');

    if (isRateLimit) {
      logger.warn('mpesa_query_limit_reached_masking', {
        billId: bill.id,
        message: error.message
      });
      return {
        status: bill.status,
        bill,
        message: 'External query limit reached. Using last known state.'
      };
    }
    throw error;
  }
};

const initiatePayment = async ({ req, billId, phone }) => {
  const bill = await getBillById(billId);
  assertPaymentAccess(bill, req.user);

  const activeAttempt = await getActivePaymentAttempt(bill);

  if (activeAttempt) {
    const synced = await syncBillStatus(activeAttempt, req);

    if (
      synced.status === PAYMENT_STATUSES.PENDING
      || synced.status === PAYMENT_STATUSES.CONFIRMED
      || synced.status === PAYMENT_STATUSES.PAID
    ) {
      return buildIdempotentPaymentResponse({
        bill: synced.bill,
        status: synced.status,
        customerMessage: synced.status === PAYMENT_STATUSES.PAID
          ? 'This bill has already been paid.'
          : 'A payment request is already active for this bill.',
      });
    }
  }

  const lockedBill = await acquirePaymentLock(billId);

  try {
    const response = await initiateStkPushRequest({
      phone,
      bill: lockedBill,
      requestId: req?.requestId,
    });


    const updatedBill = await linkIdentifiersSafely(billId, {
      checkoutRequestId: response.CheckoutRequestID,
      merchantRequestId: response.MerchantRequestID,
    });

    logger.info('mpesa_stk_push_initiated', {
      requestId: req.requestId,
      billId,
      checkoutRequestId: updatedBill.checkoutRequestId,
      merchantRequestId: updatedBill.merchantRequestId,
    });

    await recordAuditEvent({
      req,
      action: 'payment.stk_push_initiated',
      entityType: 'Bill',
      entityId: billId,
      metadata: {
        checkoutRequestId: updatedBill.checkoutRequestId,
        merchantRequestId: updatedBill.merchantRequestId,
      },
    });

    return response;
  } catch (error) {
    await releasePaymentLock(billId);
    throw error;
  }
};

const checkPaymentStatus = async ({ req, billId }) => {
  const bill = await getBillById(billId);
  assertPaymentAccess(bill, req.user);
  return syncBillStatus(bill, req);
};

const processSuccessfulCallback = async ({ callback, bill, requestMeta }) => {
  const duplicateReceipt = callback.mpesaReceipt
    ? await findBillByReceipt(callback.mpesaReceipt)
    : null;

  if (duplicateReceipt && String(duplicateReceipt.id) !== String(bill.id)) {
    return markReceiptCollisionAnomaly({
      bill,
      callback,
      conflictingBill: duplicateReceipt,
      requestMeta,
    });
  }

  const audit = auditPaymentAgainstBill({
    bill,
    actualAmountPaid: callback.actualAmountPaid,
  });

  if (!audit.ok) {
    const anomalyBill = await markPaymentAnomaly(bill.id, {
      receiptNumber: callback.mpesaReceipt,
      amountPaid: callback.actualAmountPaid,
      amountDifference: audit.difference,
      reason: audit.reason,
      auditFlag: PAYMENT_AUDIT_FLAGS.PAYMENT_ANOMALY,
    });

    await recordAuditEvent({
      req: requestMeta,
      action: 'payment.anomaly_detected',
      entityType: 'Bill',
      entityId: anomalyBill.id,
      status: 'WARNING',
      metadata: {
        billNumber: anomalyBill.billNumber,
        difference: audit.difference,
        tolerance: audit.tolerance,
      },
      actor: CALLBACK_ACTOR,
    });

    return anomalyBill;
  }

  const paidBill = await persistSuccessfulPayment({
    bill,
    callback,
    requestMeta,
  });

  await recordAuditEvent({
    req: requestMeta,
    action: 'payment.callback_processed',
    entityType: 'Bill',
    entityId: paidBill.id,
    metadata: {
      billNumber: paidBill.billNumber,
      receipt: paidBill.mpesaReceiptNumber,
    },
    actor: CALLBACK_ACTOR,
  });

  return paidBill;
};

const processFailedCallback = async ({ callback, bill, requestMeta }) => {
  if (bill.status === PAYMENT_STATUSES.PAID) {
    logger.warn('mpesa_callback_failed_for_paid_bill', {
      requestId: requestMeta.requestId,
      billId: bill.id,
      checkoutRequestId: callback.checkoutRequestId,
      resultCode: callback.resultCode,
    });

    return releaseCallbackProcessing(bill.id);
  }

  const failedBill = await markPaymentFailure(
    bill.id,
    callback.resultDesc || 'Payment failed',
    {
      source: 'callback',
      resultCode: callback.resultCode,
    }
  );

  await recordAuditEvent({
    req: requestMeta,
    action: 'payment.callback_failed',
    entityType: 'Bill',
    entityId: failedBill.id,
    status: 'FAILED',
    metadata: {
      billNumber: failedBill.billNumber,
      reason: failedBill.failureReason,
    },
    actor: CALLBACK_ACTOR,
  });

  return failedBill;
};

const processCallbackAsync = async ({ payload, requestMeta }) => {
  const callback = parseCallbackPayload(payload);

  logger.info('mpesa_callback_received', {
    requestId: requestMeta.requestId,
    checkoutRequestId: callback.checkoutRequestId,
    merchantRequestId: callback.merchantRequestId,
    resultCode: callback.resultCode,
    resultDesc: callback.resultDesc,
  });

  let bill = await findBillByIdentifiers({
    checkoutRequestId: callback.checkoutRequestId,
    merchantRequestId: callback.merchantRequestId,
  });

  if (!bill && isSuccessfulResultCode(callback.resultCode)) {
    bill = await findFuzzyPendingBill({
      amountPaid: callback.actualAmountPaid,
      phoneNumber: callback.paymentPhone,
    });
  }

  if (!bill) {
    logger.warn('mpesa_callback_orphaned', {
      requestId: requestMeta.requestId,
      checkoutRequestId: callback.checkoutRequestId,
      merchantRequestId: callback.merchantRequestId,
    });
    return null;
  }

  if (callback.checkoutRequestId && !bill.checkoutRequestId) {
    bill = await linkIdentifiersSafely(bill.id, {
      checkoutRequestId: callback.checkoutRequestId,
      merchantRequestId: callback.merchantRequestId,
    });
  }

  const claim = await claimCallbackProcessing(bill.id, {
    resultCode: callback.resultCode,
  });

  if (!claim.claimed) {
    logger.warn('mpesa_callback_duplicate_ignored', {
      requestId: requestMeta.requestId,
      billId: claim.bill.id,
      checkoutRequestId: callback.checkoutRequestId,
      merchantRequestId: callback.merchantRequestId,
      reason: claim.reason,
    });

    await recordAuditEvent({
      req: requestMeta,
      action: 'payment.callback_duplicate_ignored',
      entityType: 'Bill',
      entityId: claim.bill.id,
      status: 'WARNING',
      metadata: {
        checkoutRequestId: callback.checkoutRequestId,
        merchantRequestId: callback.merchantRequestId,
        reason: claim.reason,
      },
      actor: CALLBACK_ACTOR,
    });

    return claim.bill;
  }

  bill = claim.bill;

  try {
    if (isSuccessfulResultCode(callback.resultCode)) {
      return await processSuccessfulCallback({ callback, bill, requestMeta });
    }

    return await processFailedCallback({ callback, bill, requestMeta });
  } catch (error) {
    await releaseCallbackProcessing(bill.id);
    throw error;
  }
};

const acknowledgeCallback = ({ headers, payload }) => {
  if (!ensureCallbackAuthorized(headers)) {
    throw new AppError('Unauthorized callback', 401, 'UNAUTHORIZED_CALLBACK');
  }

  parseCallbackPayload(payload);
  return { ResultCode: 0, ResultDesc: 'Success' };
};

const reconcilePendingTransactions = async () => {
  const candidates = await getReconciliationCandidates();

  for (const bill of candidates) {
    try {
      await syncBillStatus(bill);
    } catch (error) {
      logger.error('mpesa_reconciliation_failed', {
        billId: bill.id,
        checkoutRequestId: bill.checkoutRequestId,
        message: error.message,
      });
    }
  }

  return candidates.length;
};

module.exports = {
  initiatePayment,
  checkPaymentStatus,
  processCallbackAsync,
  acknowledgeCallback,
  reconcilePendingTransactions,
};
