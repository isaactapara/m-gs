const axios = require('axios');
const { env } = require('../../config/env');
const AppError = require('../../core/appError');
const logger = require('../../core/logger');
const { PAYMENT_WINDOWS } = require('../../core/constants/paymentConstants');

const MPESA_BASE_URL = env.nodeEnv === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

let cachedToken = null;
let tokenExpiry = null;

const getTimestamp = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${date}${hours}${minutes}${seconds}`;
};

const getPassword = (timestamp) => {
  const rawString = `${env.mpesaShortcode}${env.mpesaPasskey}${timestamp}`;
  return Buffer.from(rawString).toString('base64');
};

const getCallbackUrl = () => process.env.MPESA_CALLBACK_URL || env.mpesaCallbackUrl;

const normalizePhoneNumber = (phone) => {
  let formattedPhone = String(phone || '').trim();

  if (formattedPhone.startsWith('0')) {
    formattedPhone = `254${formattedPhone.slice(1)}`;
  }

  if (formattedPhone.startsWith('+')) {
    formattedPhone = formattedPhone.slice(1);
  }

  return formattedPhone;
};

const ensureCallbackAuthorized = (headers = {}) => {
  if (env.nodeEnv === 'development') {
    return true;
  }

  if (!env.mpesaCallbackSecret) {
    return true;
  }

  const providedSecret = String(
    headers['x-mpesa-callback-secret']
    || headers['x-api-key']
    || headers['x-callback-secret']
    || ''
  ).trim();

  return providedSecret === env.mpesaCallbackSecret;
};

const generateAuthToken = async () => {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - 300000) {
    return cachedToken;
  }

  const auth = Buffer.from(`${env.mpesaConsumerKey}:${env.mpesaConsumerSecret}`).toString('base64');

  const response = await axios.get(
    `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: { Authorization: `Basic ${auth}` },
      timeout: PAYMENT_WINDOWS.REQUEST_TIMEOUT_MS,
    }
  );

  cachedToken = response.data.access_token;
  tokenExpiry = Date.now() + ((response.data.expires_in || 3599) * 1000);
  return cachedToken;
};

const mapMpesaError = (error, fallbackMessage) => {
  const errorData = error.response?.data;
  const errorMessage = errorData?.errorMessage || errorData?.message || error.message || fallbackMessage;

  logger.error('mpesa_gateway_error', {
    message: errorMessage,
    status: error.response?.status,
    errorData,
  });

  if (
    errorMessage.includes('SpikeArrest')
    || errorData?.errorCode === '400.002.02'
    || error.response?.status === 429
  ) {
    return new AppError(
      'M-Pesa system is cooling down. Please wait 10 seconds before retrying.',
      429,
      'RATE_LIMIT'
    );
  }

  if (errorMessage.includes('Duplicate') || errorMessage.includes('AlreadyProcessed')) {
    return new AppError(
      'A similar transaction is already underway. Please wait a moment while we complete your initial request.',
      409,
      'DUPLICATE_REQUEST'
    );
  }

  return new AppError(fallbackMessage, 502, 'MPESA_GATEWAY_ERROR', errorData || null);
};

const initiateStkPushRequest = async ({ phone, bill, requestId }) => {

  const token = await generateAuthToken();
  const timestamp = getTimestamp();
  const password = getPassword(timestamp);
  const callbackUrl = getCallbackUrl();

  if (!callbackUrl || callbackUrl.trim().length < 5) {
    throw new AppError(
      'M-Pesa Callback URL is not configured. Since automatic tunneling has been disabled for stability, please start a tunnel (e.g., cloudflared) and provide the URL in your .env as MPESA_CALLBACK_URL.',
      500,
      'MISSING_CALLBACK_URL'
    );
  }


  const normalizedPhone = normalizePhoneNumber(phone);

  const payload = {
    BusinessShortCode: env.mpesaShortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.ceil(bill.total),
    PartyA: normalizedPhone,
    PartyB: env.mpesaShortcode,
    PhoneNumber: normalizedPhone,
    CallBackURL: callbackUrl,
    AccountReference: `MG-${String(bill.id).slice(-4)}`,
    TransactionDesc: 'MG Restaurant Hub Payment',
  };

  logger.info('mpesa_stk_push_payload', { 
    requestId, 
    billId: bill.id,

    amount: payload.Amount,
    phone: payload.PhoneNumber,
    callbackUrl: payload.CallBackURL
  });

  try {
    const response = await axios.post(
      `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
      payload,
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: PAYMENT_WINDOWS.REQUEST_TIMEOUT_MS,
      }
    );

    return response.data;
  } catch (error) {
    logger.error('mpesa_stk_push_failed_gateway', {
      requestId,
      billId: bill.id,

      error: error.message,
      response: error.response?.data
    });
    throw mapMpesaError(error, 'Failed to initiate M-Pesa payment');
  }

};

const queryStkStatusRequest = async (checkoutRequestId) => {
  const token = await generateAuthToken();
  const timestamp = getTimestamp();
  const password = getPassword(timestamp);

  try {
    const response = await axios.post(
      `${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`,
      {
        BusinessShortCode: env.mpesaShortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: PAYMENT_WINDOWS.REQUEST_TIMEOUT_MS,
      }
    );

    return response.data;
  } catch (error) {
    throw mapMpesaError(error, 'Failed to query M-Pesa status');
  }
};

const parseMpesaDate = (dateStr) => {
  if (!dateStr || String(dateStr).length < 14) {
    return new Date();
  }

  const value = String(dateStr);

  try {
    const year = Number.parseInt(value.slice(0, 4), 10);
    const month = Number.parseInt(value.slice(4, 6), 10) - 1;
    const day = Number.parseInt(value.slice(6, 8), 10);
    const hours = Number.parseInt(value.slice(8, 10), 10);
    const minutes = Number.parseInt(value.slice(10, 12), 10);
    const seconds = Number.parseInt(value.slice(12, 14), 10);
    return new Date(year, month, day, hours, minutes, seconds);
  } catch (error) {
    return new Date();
  }
};

const extractIdFromText = (text) => {
  if (!text) {
    return null;
  }

  const matches = String(text).toUpperCase().match(/[A-Z0-9]{10,12}/g) || [];
  return matches.find((candidate) => /^[A-Z0-9]{10,12}$/.test(candidate) && /\d/.test(candidate)) || null;
};

const parseCallbackPayload = (payload) => {
  const callbackData = payload?.Body?.stkCallback;

  if (!callbackData) {
    throw new AppError('Invalid Payload', 400, 'INVALID_CALLBACK_PAYLOAD');
  }

  const callbackMetadata = callbackData.CallbackMetadata?.Item || [];
  const getMeta = (name) => {
    const item = callbackMetadata.find(
      (entry) => String(entry.Name).toLowerCase() === String(name).toLowerCase()
    );
    return item ? item.Value : null;
  };

  const rawAmount = getMeta('Amount');
  const rawPhone = getMeta('PhoneNumber');
  const normalizedPhone = rawPhone == null ? null : normalizePhoneNumber(rawPhone);
  const parsedAmount = rawAmount == null || rawAmount === '' ? null : Number(rawAmount);
  const paymentPhone = normalizedPhone || null;

  return {
    checkoutRequestId: callbackData.CheckoutRequestID || null,
    merchantRequestId: callbackData.MerchantRequestID || callbackData.MerchantRequestId || null,
    resultCode: Number(callbackData.ResultCode),
    resultDesc: callbackData.ResultDesc || '',
    mpesaReceipt: getMeta('MpesaReceiptNumber')
      || getMeta('MpesaReceiptNo')
      || getMeta('ReceiptNo')
      || getMeta('TransactionID')
      || extractIdFromText(callbackData.ResultDesc)
      || extractIdFromText(JSON.stringify(payload)),
    paymentPhone,
    actualAmountPaid: Number.isFinite(parsedAmount) ? parsedAmount : null,
    mpesaTransactionDate: parseMpesaDate(getMeta('TransactionDate')),
  };
};

module.exports = {
  MPESA_BASE_URL,
  ensureCallbackAuthorized,
  normalizePhoneNumber,
  initiateStkPushRequest,
  queryStkStatusRequest,
  parseCallbackPayload,
  parseMpesaDate,
  extractIdFromText,
};
