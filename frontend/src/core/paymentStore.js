export class PaymentStore {
  constructor(rootStore) {
    this.rootStore = rootStore;
    this.isPaymentProcessing = false;
  }

  setPaymentProcessing(value) {
    this.isPaymentProcessing = Boolean(value);
    this.rootStore.notify();
  }

  destroy() {
    // No-op
  }
}
