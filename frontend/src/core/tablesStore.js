import { loadJson, saveJson } from './storage.js';

const TABLES_CACHE_KEY = 'tables';
const DEFAULT_TABLES = [
  { id: '1', name: 'Table 1', status: 'FREE', position: { x: 50, y: 150 } },
  { id: '2', name: 'Table 2', status: 'FREE', position: { x: 200, y: 150 } },
  { id: '3', name: 'Table 3', status: 'FREE', position: { x: 350, y: 150 } },
];
const VALID_STATUSES = new Set(['FREE', 'OCCUPIED', 'PENDING']);

const cloneDefaultTables = () => DEFAULT_TABLES.map((table) => ({
  ...table,
  position: { ...table.position },
}));

const clampPositionValue = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
};

export class TablesStore {
  constructor(rootStore) {
    this.rootStore = rootStore;
    this.tables = cloneDefaultTables();
    this.persistTimer = null;
    this.lastSerialized = JSON.stringify(this.tables);
  }

  readCachedTables() {
    return this.normalizeTables(loadJson(TABLES_CACHE_KEY, cloneDefaultTables()));
  }

  normalizeTables(payloadTables = []) {
    const source = Array.isArray(payloadTables) && payloadTables.length
      ? payloadTables
      : cloneDefaultTables();

    return source.map((table, index) => {
      const fallbackPosition = DEFAULT_TABLES[index]?.position || {
        x: 50 + (index * 150),
        y: 150,
      };

      return {
        id: String(table.id || table.tableId || index + 1).trim() || String(index + 1),
        name: String(table.name || `Table ${index + 1}`).trim() || `Table ${index + 1}`,
        status: VALID_STATUSES.has(table.status) ? table.status : 'FREE',
        position: {
          x: clampPositionValue(table.position?.x ?? table.x, fallbackPosition.x),
          y: clampPositionValue(table.position?.y ?? table.y, fallbackPosition.y),
        },
      };
    });
  }

  serializeTables() {
    return this.tables.map((table) => ({
      tableId: table.id,
      name: table.name,
      status: table.status,
      position: {
        x: table.position?.x ?? table.x ?? 0,
        y: table.position?.y ?? table.y ?? 0,
      },
    }));
  }

  persistCache() {
    this.lastSerialized = JSON.stringify(this.tables);
    saveJson(TABLES_CACHE_KEY, this.tables);
  }

  schedulePersist() {
    if (!this.rootStore.authStore.isAuthenticated) {
      return;
    }

    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
    }

    this.persistTimer = window.setTimeout(async () => {
      try {
        await this.persistNow();
      } catch (error) {
        console.error('Failed to persist floor plan:', error);
      }
    }, 250);
  }

  touchTables({ persist = true, notify = true } = {}) {
    this.persistCache();

    if (persist) {
      this.schedulePersist();
    }

    if (notify) {
      this.rootStore.notify();
    }
  }

  setTables(tables, { persist = true, notify = true } = {}) {
    this.tables = this.normalizeTables(tables);
    this.touchTables({ persist, notify });
  }

  async fetchFloorPlan({ notify = true } = {}) {
    if (!this.rootStore.authStore.isAuthenticated) {
      this.setTables(this.readCachedTables(), { persist: false, notify });
      return this.tables;
    }

    try {
      const floorPlan = await this.rootStore.apiClient.get('/tables');
      this.setTables(floorPlan.tables || [], { persist: false, notify });
      return this.tables;
    } catch (error) {
      this.setTables(this.readCachedTables(), { persist: false, notify });
      return this.tables;
    }
  }

  async persistNow() {
    if (!this.rootStore.authStore.isAuthenticated) {
      return;
    }

    const saved = await this.rootStore.apiClient.put('/tables', {
      tables: this.serializeTables(),
    });

    this.tables = this.normalizeTables(saved.tables || []);
    this.persistCache();
    this.rootStore.notify();
  }

  syncCacheFromMemory() {
    const serialized = JSON.stringify(this.tables);

    if (serialized === this.lastSerialized) {
      return;
    }

    this.lastSerialized = serialized;
    saveJson(TABLES_CACHE_KEY, this.tables);
    this.schedulePersist();
  }

  addTable(table) {
    const [normalizedTable] = this.normalizeTables([table]);
    this.tables = [...this.tables, normalizedTable];
    this.touchTables();
  }

  removeTable(id) {
    this.tables = this.tables.filter((table) => table.id !== id);
    this.touchTables();
  }

  renameTable(id, name) {
    const table = this.tables.find((entry) => entry.id === id);
    const nextName = String(name || '').trim();

    if (!table || !nextName) {
      return;
    }

    table.name = nextName;
    this.touchTables();
  }

  updateTableStatus(id, status) {
    const table = this.tables.find((entry) => entry.id === id);
    if (!table) {
      return;
    }

    table.status = VALID_STATUSES.has(status) ? status : table.status;
    this.touchTables();
  }

  updateTablePosition(id, x, y) {
    const table = this.tables.find((entry) => entry.id === id);
    if (!table) {
      return;
    }

    table.position = { x, y };
    table.x = x;
    table.y = y;
    this.touchTables();
  }
}

