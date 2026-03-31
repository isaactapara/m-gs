const { env } = require('../../config/env');
const { PAYMENT_STATUSES } = require('../../core/constants/paymentConstants');

const auditPaymentAgainstBill = ({ bill, actualAmountPaid }) => {
  const paidAmount = Number(actualAmountPaid);
  const expectedAmount = Number(bill.total || 0);
  const tolerance = Number(env.mpesaAmountTolerance || 1);
  const difference = Number((paidAmount - expectedAmount).toFixed(2));

  if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
    return {
      ok: false,
      difference,
      tolerance,
      reason: 'Callback amount is missing or invalid',
      recommendedStatus: PAYMENT_STATUSES.PARTIAL_PAYMENT_FLAGGED,
    };
  }

  if (Math.abs(difference) > tolerance) {
    return {
      ok: false,
      difference,
      tolerance,
      reason: `FRAUD ALERT: Expected ${expectedAmount}, Received ${paidAmount}`,
      recommendedStatus: PAYMENT_STATUSES.PARTIAL_PAYMENT_FLAGGED,
    };
  }

  return {
    ok: true,
    difference,
    tolerance,
    reason: null,
    recommendedStatus: PAYMENT_STATUSES.PAID,
  };
};

module.exports = {
  auditPaymentAgainstBill,
};
