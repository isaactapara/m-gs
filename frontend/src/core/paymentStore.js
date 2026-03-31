const POLL_BACKOFF_INTERVALS = [2000, 5000, 10000, 20000, 40000];
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

export class PaymentStore {
  constructor(rootStore) {
    this.rootStore = rootStore;
    this.isPaymentProcessing = false;
    this.pollingEntries = new Map();
    this.handlePageLifecycle = () => {
      this.stopAllPolling({ message: 'Polling cancelled due to navigation.' });
    };

    window.addEventListener('pagehide', this.handlePageLifecycle);
    window.addEventListener('beforeunload', this.handlePageLifecycle);
  }

  setPaymentProcessing(value) {
    this.isPaymentProcessing = Boolean(value);
    this.rootStore.notify();
  }

  async triggerStkPushApi(phoneNumber, amount, billId) {
    try {
      const data = await this.rootStore.apiClient.post('/payments/stk-push', {
        phone: phoneNumber,
        amount,
        billId,
      });

      return { ok: true, data };
    } catch (error) {
      return {
        ok: false,
        data: error.response?.data?.error || error.response?.data,
        status: error.response?.status,
      };
    }
  }

  createPollingEntry(billId, onStatusChange, resolve) {
    return {
      billId,
      attempts: 0,
      startTime: Date.now(),
      cancelled: false,
      settled: false,
      timeoutId: null,
      abortController: null,
      onStatusChange,
      resolve,
    };
  }

  settlePollingEntry(billId, result, { abortRequest = true } = {}) {
    const entry = this.pollingEntries.get(billId);

    if (!entry || entry.settled) {
      return;
    }

    entry.settled = true;
    entry.cancelled = true;

    if (entry.timeoutId) {
      clearTimeout(entry.timeoutId);
    }

    if (abortRequest && entry.abortController) {
      entry.abortController.abort();
    }

    this.pollingEntries.delete(billId);
    entry.resolve(result);
  }

  scheduleNextPoll(entry, delay) {
    if (entry.cancelled || entry.settled) {
      return;
    }

    entry.timeoutId = window.setTimeout(() => {
      this.executePoll(entry);
    }, delay);
  }

  async executePoll(entry) {
    if (entry.cancelled || entry.settled) {
      return;
    }

    const activeEntry = this.pollingEntries.get(entry.billId);
    if (activeEntry !== entry) {
      return;
    }

    if (Date.now() - entry.startTime > POLL_TIMEOUT_MS) {
      this.settlePollingEntry(entry.billId, {
        success: false,
        message: 'Payment verification timed out. Please check your phone or Settled Bills.',
      });
      return;
    }

    entry.abortController = new AbortController();

    try {
      const response = await this.rootStore.apiClient.post(
        '/payments/check-status',
        { billId: entry.billId },
        { signal: entry.abortController.signal }
      );

      entry.attempts += 1;
      const status = response.status;
      const billData = response.bill || response;

      if (status === 'PAID' || status === 'CONFIRMED') {
        const updatedBill = this.rootStore.billingStore.upsertBill(billData, { notify: false });
        this.rootStore.notify();
        this.settlePollingEntry(entry.billId, {
          success: true,
          status,
          bill: updatedBill,
        });
        return;
      }

      if (status === 'FAILED' || status === 'CANCELLED' || status === 'PARTIAL_PAYMENT_FLAGGED') {
        if (billData?._id || billData?.id) {
          this.rootStore.billingStore.upsertBill(billData, { notify: false });
          this.rootStore.notify();
        }

        this.settlePollingEntry(entry.billId, {
          success: false,
          status,
          message: response.failureReason || response.message || 'Payment failed or was cancelled.',
        });
        return;
      }

      if (entry.attempts > 2 && typeof entry.onStatusChange === 'function') {
        entry.onStatusChange('verifying');
      }
    } catch (error) {
      if (error?.name === 'AbortError') {
        if (entry.cancelled || entry.settled) {
          return;
        }
      } else {
        console.error('Polling network error (retrying):', error);
      }
    }

    const nextInterval = POLL_BACKOFF_INTERVALS[
      Math.min(entry.attempts, POLL_BACKOFF_INTERVALS.length - 1)
    ];

    this.scheduleNextPoll(entry, nextInterval);
  }

  pollBillStatus(billId, onStatusChange) {
    this.stopPolling(billId, {
      message: 'Polling cancelled because a new verification started.',
    });

    return new Promise((resolve) => {
      const entry = this.createPollingEntry(billId, onStatusChange, resolve);
      this.pollingEntries.set(billId, entry);
      this.scheduleNextPoll(entry, 0);
    });
  }

  stopPolling(billId, { message = 'Polling cancelled.' } = {}) {
    const entry = this.pollingEntries.get(billId);

    if (!entry) {
      return;
    }

    this.settlePollingEntry(billId, {
      success: false,
      message,
    });
  }

  stopAllPolling({ message = 'Polling cancelled.' } = {}) {
    Array.from(this.pollingEntries.keys()).forEach((billId) => {
      this.stopPolling(billId, { message });
    });
  }

  destroy() {
    this.stopAllPolling({ message: 'Polling cancelled because the store was destroyed.' });
    window.removeEventListener('pagehide', this.handlePageLifecycle);
    window.removeEventListener('beforeunload', this.handlePageLifecycle);
  }
}
