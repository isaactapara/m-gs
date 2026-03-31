import { loadJson, removeValue, saveJson } from './storage.js';

const CURRENT_USER_KEY = 'currentUser';
const USER_ROLE_KEY = 'userRole';

export class AuthStore {
  constructor(rootStore) {
    this.rootStore = rootStore;
    this.currentUser = loadJson(CURRENT_USER_KEY, null);
    this.userRole = loadJson(USER_ROLE_KEY, null);
    this.redirectingAfterUnauthorized = false;
  }

  get isAuthenticated() {
    return Boolean(this.currentUser?.token);
  }

  persistSession() {
    saveJson(CURRENT_USER_KEY, this.currentUser);
    saveJson(USER_ROLE_KEY, this.userRole);
  }

  clearSession() {
    removeValue(CURRENT_USER_KEY);
    removeValue(USER_ROLE_KEY);
  }

  async login(username, password) {
    try {
      const data = await this.rootStore.apiClient.post(
        '/auth/login',
        { username, password },
        { suppressUnauthorizedHandler: true }
      );


      this.currentUser = data;
      this.userRole = data.role;
      this.redirectingAfterUnauthorized = false;
      this.persistSession();

      await this.rootStore.fetchInitialData();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error?.message || error.response?.data?.message || 'Login failed',
      };
    }
  }

  logout({ redirect = true } = {}) {
    this.currentUser = null;
    this.userRole = null;
    this.clearSession();
    this.rootStore.paymentStore.stopAllPolling({ message: 'Polling cancelled after logout.' });
    this.rootStore.notify();

    if (redirect) {
      window.location.href = '/login.html';
    }
  }

  handleUnauthorized() {
    if (this.redirectingAfterUnauthorized) {
      return;
    }

    this.redirectingAfterUnauthorized = true;
    this.logout({ redirect: true });
  }
}
