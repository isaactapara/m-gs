export class PaymentStore {
  constructor(rootStore) {
    this.rootStore = rootStore;
    this.isPaymentProcessing = false;
    this.activePollId = null;
  }

  setPaymentProcessing(value) {
    this.isPaymentProcessing = Boolean(value);
    this.rootStore.notify();
  }

  /**
   * Prevents system crash on logout. 
   * Future implementation: clear any active M-Pesa STK push polling.
   */
  stopAllPolling(options = {}) {
    if (this.activePollId) {
      clearTimeout(this.activePollId);
      this.activePollId = null;
    }
    this.isPaymentProcessing = false;
    console.log('Payment polling stopped:', options.message || 'No reason provided');
  }

  destroy() {
    this.stopAllPolling({ message: 'Store destroyed' });
  }
}
