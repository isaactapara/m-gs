import { ApiClient } from './apiClient.js';
import { AuthStore } from './authStore.js';
import { UiStore } from './uiStore.js';
import { CartStore } from './cartStore.js';
import { BillingStore } from './billingStore.js';
import { PaymentStore } from './paymentStore.js';
import { TablesStore } from './tablesStore.js';

export class RootStore {
  constructor() {
    this.subscribers = [];

    this.authStore = new AuthStore(this);
    this.uiStore = new UiStore(this);
    this.cartStore = new CartStore(this);
    this.billingStore = new BillingStore(this);
    this.paymentStore = new PaymentStore(this);
    this.tablesStore = new TablesStore(this);
    this.apiClient = new ApiClient(this);

    this.handleFocusSync = () => {
      if (!this.currentUser?.token) {
        return;
      }

      this.refreshSharedState({ notify: true }).catch((error) => {
        console.warn('Failed to refresh shared restaurant state:', error);
      });
    };

    this.handleVisibilitySync = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        this.handleFocusSync();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', this.handleFocusSync);
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilitySync);
    }

    // Compatibility aliases for existing page modules.
    this.auth = this.authStore;
    this.ui = this.uiStore;
    this.billing = this.billingStore;
    this.payment = this.paymentStore;
    this.api = this.apiClient;

    this.fetchInitialData();
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((entry) => entry !== callback);
    };
  }

  notify() {
    this.tablesStore.syncCacheFromMemory();
    this.uiStore.syncSettingsCacheFromMemory();
    this.subscribers.forEach((callback) => callback(this));
  }

  /**
   * Escapes a value for safe injection into HTML **text nodes only**.
   *
   * @param {*} value - Raw value to escape (menu item names, usernames, etc.)
   * @returns {string} HTML-entity-encoded string safe for use as element text content.
   *
   * @security
   * ╔══════════════════════════════════════════════════════════════════════╗
   * ║  WARNING — PARTIAL XSS PROTECTION. READ BEFORE USE.                ║
   * ╠══════════════════════════════════════════════════════════════════════╣
   * ║  This method uses the browser's native textContent/innerHTML trick  ║
   * ║  to HTML-encode characters like <, >, &, and ".                    ║
   * ║                                                                      ║
   * ║  ✅ SAFE for:  injecting into element inner content, e.g.:          ║
   * ║     `<h3>${store.sanitize(item.name)}</h3>`                         ║
   * ║                                                                      ║
   * ║  ❌ NOT SAFE for: HTML attribute contexts, e.g.:                    ║
   * ║     `<a href="${store.sanitize(url)}">` — javascript: URIs survive  ║
   * ║     `<img src="${store.sanitize(src)}">` — data: URIs survive       ║
   * ║     `<div onclick="${store.sanitize(handler)}">` — event handlers   ║
   * ║                                                                      ║
   * ║  If you need to place user-supplied data into an HTML attribute,    ║
   * ║  install DOMPurify and use DOMPurify.sanitize() with a strict       ║
   * ║  ALLOWED_ATTR config, or use DOM APIs (setAttribute) instead of     ║
   * ║  string interpolation entirely.                                      ║
   * ╚══════════════════════════════════════════════════════════════════════╝
   */
  sanitize(value) {
    if (!value) {
      return '';
    }

    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }

  async refreshSharedState({ notify = true } = {}) {
    await Promise.all([
      this.uiStore.fetchSettings({ notify: false }),
      this.tablesStore.fetchFloorPlan({ notify: false }),
    ]);

    if (notify) {
      this.notify();
    }
  }

  async fetchInitialData() {
    if (!this.currentUser?.token) {
      this.billingStore.resetState({ notify: false });
      await this.refreshSharedState({ notify: false });
      this.notify();
      return;
    }

    await Promise.all([
      this.billingStore.fetchInitialData({ notify: false }),
      this.refreshSharedState({ notify: false }),
    ]);

    this.notify();
  }

  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', this.handleFocusSync);
    }

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilitySync);
    }

    this.paymentStore.destroy();
    this.subscribers = [];
  }

  get isDarkMode() { return this.uiStore.isDarkMode; }
  set isDarkMode(value) { this.uiStore.setDarkMode(value); }

  get isSidebarCollapsed() { return this.uiStore.isSidebarCollapsed; }
  set isSidebarCollapsed(value) { this.uiStore.setSidebarCollapsed(value); }

  get currentUser() { return this.authStore.currentUser; }
  get userRole() { return this.authStore.userRole; }
  get settings() { return this.uiStore.settings; }

  get menu() { return this.billingStore.menu; }
  get bills() { return this.billingStore.bills; }
  get users() { return this.billingStore.users; }
  get reportSummary() { return this.billingStore.reportSummary; }

  get cart() { return this.cartStore.cart; }

  get isPaymentProcessing() { return this.paymentStore.isPaymentProcessing; }
  set isPaymentProcessing(value) { this.paymentStore.setPaymentProcessing(value); }

  get tables() { return this.tablesStore.tables; }
  set tables(value) { this.tablesStore.setTables(value); }

  toggleDarkMode() { this.uiStore.toggleDarkMode(); }
  toggleSidebarCollapse() { this.uiStore.toggleSidebarCollapse(); }
  async updateSettings(patch) { return this.uiStore.updateSettings(patch); }

  async login(username, pin) { return this.authStore.login(username, pin); }
  logout(options) { return this.authStore.logout(options); }

  addToCart(item) { return this.cartStore.addToCart(item); }
  removeFromCart(itemId) { return this.cartStore.removeFromCart(itemId); }
  clearCart(shouldNotify) { return this.cartStore.clearCart(shouldNotify); }

  async addMenuItem(itemData) { return this.billingStore.addMenuItem(itemData); }
  async updateMenuItem(id, itemData) { return this.billingStore.updateMenuItem(id, itemData); }
  async deleteMenuItem(id) { return this.billingStore.deleteMenuItem(id); }

  async createBill(billData) { return this.billingStore.createBill(billData); }
  async deleteBill(id) { return this.billingStore.deleteBill(id); }
  async updateBillStatus(id, status, paymentMethod = null) {
    return this.billingStore.updateBillStatus(id, status, paymentMethod);
  }
  async addUser(username, pin) { return this.billingStore.addUser(username, pin); }
  async deleteUser(id) { return this.billingStore.deleteUser(id); }
  async fetchReportSummary(timeframe) { return this.billingStore.fetchReportSummary(timeframe); }
  async fetchAllSummaries() { return this.billingStore.fetchAllSummaries(); }




  addTable(table) { return this.tablesStore.addTable(table); }
  removeTable(id) { return this.tablesStore.removeTable(id); }
  renameTable(id, name) { return this.tablesStore.renameTable(id, name); }
  updateTableStatus(id, status) { return this.tablesStore.updateTableStatus(id, status); }
  updateTablePosition(id, x, y) { return this.tablesStore.updateTablePosition(id, x, y); }
}
