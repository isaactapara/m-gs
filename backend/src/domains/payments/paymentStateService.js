const prisma = require('../../config/prisma');
const AppError = require('../../core/appError');
const { env } = require('../../config/env');
const {
  PAYMENT_STATUSES,
  TERMINAL_PAYMENT_STATUSES,
  ACTIVE_PAYMENT_STATUSES,
  PAYMENT_AUDIT_FLAGS,
  PAYMENT_WINDOWS,
  isActivePaymentStatus,
} = require('../../core/constants/paymentConstants');

const getBillById = async (billId) => {
  const bill = await prisma.bill.findUnique({
    where: { id: billId },
    include: { items: true },
  });

  if (!bill) {
    throw new AppError('Bill not found', 404, 'BILL_NOT_FOUND');
  }

  return bill;
};

const assertPaymentAccess = (bill, user) => {
  if (!user || user.role === 'owner') {
    return;
  }

  if (String(bill.cashierId) !== String(user._id || user.id)) {
    throw new AppError('Access denied for this bill', 403, 'BILL_ACCESS_FORBIDDEN');
  }
};

const hasPendingGatewayTransaction = (bill) => (
  Boolean(bill.checkoutRequestId)
  && !bill.callbackProcessedAt
  && isActivePaymentStatus(bill.status)
);

const getActivePaymentAttempt = async (billOrId) => {
  const bill = typeof billOrId === 'object' && billOrId !== null
    ? billOrId
    : await getBillById(billOrId);

  return hasPendingGatewayTransaction(bill) ? bill : null;
};

const acquirePaymentLock = async (billId) => {
  const bill = await getBillById(billId);

  if (bill.status === PAYMENT_STATUSES.PAID) {
    throw new AppError('This bill is already paid', 400, 'BILL_ALREADY_PAID');
  }

  if (bill.status === PAYMENT_STATUSES.PARTIAL_PAYMENT_FLAGGED) {
    throw new AppError('This bill has a flagged payment anomaly and needs manual review before another request.', 409, 'PAYMENT_REVIEW_REQUIRED');
  }

  if (hasPendingGatewayTransaction(bill)) {
    throw new AppError('A payment request is already active for this bill. Wait for status sync before retrying.', 409, 'DUPLICATE_REQUEST');
  }

  const now = new Date();
  const lockUntil = new Date(now.getTime() + PAYMENT_WINDOWS.DUPLICATE_WINDOW_MS);

  // Prisma Atomic Lock via updateMany
  const { count } = await prisma.bill.updateMany({
    where: {
      id: billId,
      status: {
        notIn: [
          PAYMENT_STATUSES.PAID,
          PAYMENT_STATUSES.CONFIRMED,
          PAYMENT_STATUSES.PARTIAL_PAYMENT_FLAGGED,
        ],
      },
      OR: [
        { paymentLockExpiresAt: null },
        { paymentLockExpiresAt: { lte: now } },
      ],
    },
    data: {
      status: PAYMENT_STATUSES.PENDING,
      lastPaymentAttemptAt: now,
      paymentLockExpiresAt: lockUntil,
      failureReason: null,
      paymentAttempts: { increment: 1 },
    },
  });

  if (count > 0) {
    return getBillById(billId);
  }

  const currentBill = await getBillById(billId);

  if (currentBill.status === PAYMENT_STATUSES.PAID) {
    throw new AppError('This bill is already paid', 400, 'BILL_ALREADY_PAID');
  }

  if (currentBill.status === PAYMENT_STATUSES.CONFIRMED || hasPendingGatewayTransaction(currentBill)) {
    throw new AppError('A payment request is already active for this bill. Wait for status sync before retrying.', 409, 'DUPLICATE_REQUEST');
  }

  throw new AppError('A payment request is already active. Please wait before retrying.', 409, 'DUPLICATE_REQUEST');
};

const releasePaymentLock = async (billId) => prisma.bill.update({
  where: { id: billId },
  data: { paymentLockExpiresAt: null },
  include: { items: true },
});

const linkCheckoutIdentifiers = async (billId, { checkoutRequestId, merchantRequestId }) => {
  const updateData = {};

  if (checkoutRequestId) updateData.checkoutRequestId = checkoutRequestId;
  if (merchantRequestId) updateData.merchantRequestId = merchantRequestId;

  if (!Object.keys(updateData).length) {
    return getBillById(billId);
  }

  return prisma.bill.update({
    where: { id: billId },
    data: updateData,
    include: { items: true },
  });
};

const findBillByIdentifiers = async ({ checkoutRequestId, merchantRequestId }) => {
  if (checkoutRequestId) {
    const byCheckout = await prisma.bill.findUnique({
      where: { checkoutRequestId },
      include: { items: true },
    });
    if (byCheckout) return byCheckout;
  }

  if (merchantRequestId) {
    return prisma.bill.findUnique({
      where: { merchantRequestId },
      include: { items: true },
    });
  }

  return null;
};

const findBillByReceipt = async (receiptNumber) => {
  if (!receiptNumber) return null;
  return prisma.bill.findUnique({
    where: { mpesaReceiptNumber: receiptNumber },
    include: { items: true },
  });
};

const findFuzzyPendingBill = async ({ amountPaid, phoneNumber }) => {
  if (!amountPaid || !phoneNumber) return null;

  return prisma.bill.findFirst({
    where: {
      OR: [
        { status: { in: ACTIVE_PAYMENT_STATUSES } },
        {
          status: PAYMENT_STATUSES.PAID,
          mpesaReceiptNumber: null,
        },
      ],
      total: {
        gte: amountPaid - 1,
        lte: amountPaid + 2,
      },
      updatedAt: { gt: new Date(Date.now() - 20 * 60 * 1000) },
    },
    orderBy: { updatedAt: 'desc' },
    include: { items: true },
  });
};

const claimCallbackProcessing = async (billId, { resultCode = null } = {}) => {
  const now = new Date();
  const staleLockCutoff = new Date(now.getTime() - PAYMENT_WINDOWS.CALLBACK_PROCESSING_LOCK_MS);

  const { count } = await prisma.bill.updateMany({
    where: {
      id: billId,
      callbackProcessedAt: null,
      OR: [
        { callbackProcessingStartedAt: null },
        { callbackProcessingStartedAt: { lte: staleLockCutoff } },
      ],
    },
    data: {
      callbackProcessingStartedAt: now,
      lastCallbackReceivedAt: now,
      lastCallbackResultCode: Number.isFinite(resultCode) ? Number(resultCode) : null,
    },
  });

  if (count > 0) {
    const claimedBill = await getBillById(billId);
    return { claimed: true, bill: claimedBill, reason: null };
  }

  const currentBill = await getBillById(billId);
  return {
    claimed: false,
    bill: currentBill,
    reason: currentBill.callbackProcessedAt ? 'already_processed' : 'processing_in_progress',
  };
};

const releaseCallbackProcessing = async (billId) => prisma.bill.update({
  where: { id: billId },
  data: { callbackProcessingStartedAt: null },
  include: { items: true },
});

const markPaymentSuccess = async (billId, {
  receiptNumber,
  paymentPhone,
  amountPaid,
  mpesaTransactionDate,
  source = 'callback',
}) => {
  const isCallbackSource = source === 'callback';
  const callbackTimestamp = isCallbackSource ? new Date() : null;

  return prisma.bill.update({
    where: { id: billId },
    data: {
      status: PAYMENT_STATUSES.PAID,
      mpesaReceiptNumber: receiptNumber || null,
      paymentPhone: paymentPhone ? String(paymentPhone) : null,
      amountPaid: Number.isFinite(amountPaid) ? amountPaid : null,
      amountDifference: 0,
      mpesaTransactionDate: mpesaTransactionDate || null,
      callbackProcessedAt: callbackTimestamp,
      callbackProcessingStartedAt: null,
      paymentLockExpiresAt: null,
      lastStatusQueryAt: isCallbackSource ? undefined : new Date(),
      failureReason: null,
    },
    include: { items: true },
  });
};

const markPaymentConfirmed = async (billId) => prisma.bill.update({
  where: { id: billId },
  data: {
    status: PAYMENT_STATUSES.CONFIRMED,
    paymentLockExpiresAt: null,
    failureReason: null,
  },
  include: { items: true },
});

const markPaymentFailure = async (billId, reason, { source = 'callback', resultCode = null } = {}) => prisma.bill.update({
  where: { id: billId },
  data: {
    status: PAYMENT_STATUSES.FAILED,
    failureReason: reason,
    callbackProcessedAt: source === 'callback' ? new Date() : null,
    callbackProcessingStartedAt: null,
    paymentLockExpiresAt: null,
    lastCallbackResultCode: Number.isFinite(resultCode) ? Number(resultCode) : null,
  },
  include: { items: true },
});

const markPaymentAnomaly = async (billId, {
  receiptNumber,
  amountPaid,
  reason,
  amountDifference,
  auditFlag,
}) => {
  const bill = await getBillById(billId);
  const flagToPush = auditFlag || PAYMENT_AUDIT_FLAGS.PAYMENT_ANOMALY;
  
  // Emulate $addToSet
  const newAuditFlags = bill.auditFlags.includes(flagToPush) 
    ? bill.auditFlags 
    : [...bill.auditFlags, flagToPush];

  return prisma.bill.update({
    where: { id: billId },
    data: {
      status: PAYMENT_STATUSES.PARTIAL_PAYMENT_FLAGGED,
      mpesaReceiptNumber: receiptNumber || null,
      amountPaid: Number.isFinite(amountPaid) ? amountPaid : null,
      failureReason: reason,
      amountDifference: amountDifference || 0,
      callbackProcessedAt: new Date(),
      callbackProcessingStartedAt: null,
      paymentLockExpiresAt: null,
      auditFlags: newAuditFlags,
    },
    include: { items: true },
  });
};

const getReconciliationCandidates = async () => {
  const olderThan = new Date(Date.now() - env.reconciliationLookbackMs);

  return prisma.bill.findMany({
    where: {
      status: { in: ACTIVE_PAYMENT_STATUSES },
      checkoutRequestId: { not: null },
      updatedAt: { lt: olderThan },
    },
    orderBy: { updatedAt: 'asc' },
    take: env.reconciliationBatchSize,
    include: { items: true },
  });
};

const updateLastStatusQueryAt = async (billId) => prisma.bill.update({
  where: { id: billId },
  data: { lastStatusQueryAt: new Date() },
});

module.exports = {
  TERMINAL_STATUSES: TERMINAL_PAYMENT_STATUSES,
  ACTIVE_STATUSES: ACTIVE_PAYMENT_STATUSES,
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
};
