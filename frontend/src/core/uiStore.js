import { loadJson, saveJson } from './storage.js';

const SETTINGS_CACHE_KEY = 'settings';
const DEFAULT_SETTINGS = {
  restaurantName: "M&G's",
  currency: 'KSH',
  timezone: 'Africa/Nairobi',
};

const readCachedSettings = () => ({
  ...DEFAULT_SETTINGS,
  ...(loadJson(SETTINGS_CACHE_KEY, DEFAULT_SETTINGS) || {}),
});

export class UiStore {
  constructor(rootStore) {
    this.rootStore = rootStore;
    this.isDarkMode = loadJson('isDarkMode', false);
    this.isSidebarCollapsed = loadJson('isSidebarCollapsed', false);
    this.settings = { ...DEFAULT_SETTINGS };
    this.lastSettingsSnapshot = JSON.stringify(this.settings);
  }

  setDarkMode(value) {
    this.isDarkMode = Boolean(value);
    saveJson('isDarkMode', this.isDarkMode);
    this.rootStore.notify();
  }

  setSidebarCollapsed(value) {
    this.isSidebarCollapsed = Boolean(value);
    saveJson('isSidebarCollapsed', this.isSidebarCollapsed);
    this.rootStore.notify();
  }

  toggleDarkMode() {
    this.setDarkMode(!this.isDarkMode);
  }

  toggleSidebarCollapse() {
    this.setSidebarCollapsed(!this.isSidebarCollapsed);
  }

  setSettings(settings, { persistCache = true, notify = true } = {}) {
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(settings || {}),
    };

    this.lastSettingsSnapshot = JSON.stringify(this.settings);

    if (persistCache) {
      saveJson(SETTINGS_CACHE_KEY, this.settings);
    }

    if (notify) {
      this.rootStore.notify();
    }
  }

  async fetchSettings({ notify = true } = {}) {
    if (!this.rootStore.authStore.isAuthenticated) {
      this.setSettings(readCachedSettings(), { persistCache: true, notify });
      return this.settings;
    }

    try {
      const settings = await this.rootStore.apiClient.get('/settings');
      this.setSettings(settings, { persistCache: true, notify });
      return this.settings;
    } catch (error) {
      this.setSettings(readCachedSettings(), { persistCache: true, notify });
      return this.settings;
    }
  }

  async updateSettings(patch) {
    const updated = await this.rootStore.apiClient.patch('/settings', patch);
    this.setSettings(updated, { persistCache: true, notify: true });
    return updated;
  }

  syncSettingsCacheFromMemory() {
    const snapshot = JSON.stringify(this.settings);

    if (snapshot === this.lastSettingsSnapshot) {
      return;
    }

    this.lastSettingsSnapshot = snapshot;
    saveJson(SETTINGS_CACHE_KEY, this.settings);
  }
}

