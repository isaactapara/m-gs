const prisma = require('../../config/prisma');
const { mapToSettingsPayload, mapToFloorPlanPayload } = require('../../mappers/mappers');

const DEFAULT_KEY = 'default';

const DEFAULT_SETTINGS = {
  key: DEFAULT_KEY,
  restaurantName: "M&G's",
  currency: 'KSH',
  timezone: 'Africa/Nairobi',
};

const DEFAULT_TABLES = [
  { tableId: '1', name: 'Table 1', status: 'FREE', positionX: 50, positionY: 150 },
  { tableId: '2', name: 'Table 2', status: 'FREE', positionX: 200, positionY: 150 },
  { tableId: '3', name: 'Table 3', status: 'FREE', positionX: 350, positionY: 150 },
];

const VALID_STATUSES = new Set(['FREE', 'OCCUPIED', 'PENDING']);

const normalizeNumber = (value, fallback) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
};

const normalizeTables = (tables = []) => {
  const source = Array.isArray(tables) && tables.length ? tables : DEFAULT_TABLES;
  const seenTableIds = new Set();

  return source.map((table, index) => {
    const fallbackId = String(index + 1);
    const defaultX = 50 + (index * 150);
    const defaultY = 150;

    let tableId = String(table.tableId || table.id || fallbackId).trim() || fallbackId;
    if (seenTableIds.has(tableId)) tableId = `${tableId}-${index + 1}`;
    seenTableIds.add(tableId);

    const name = String(table.name || `Table ${index + 1}`).trim().slice(0, 80) || `Table ${index + 1}`;
    const status = VALID_STATUSES.has(table.status) ? table.status : 'FREE';

    // Handle extraction from flat DB format OR nested Mongoose format gracefully
    const posX = table.position?.x ?? table.positionX ?? table.x;
    const posY = table.position?.y ?? table.positionY ?? table.y;

    return {
      tableId,
      name,
      status,
      positionX: normalizeNumber(posX, defaultX),
      positionY: normalizeNumber(posY, defaultY),
      sortOrder: index,
    };
  });
};

const sanitizeSettingsInput = (input = {}) => {
  const updates = {};
  if (Object.prototype.hasOwnProperty.call(input, 'restaurantName')) updates.restaurantName = String(input.restaurantName || '').trim() || DEFAULT_SETTINGS.restaurantName;
  if (Object.prototype.hasOwnProperty.call(input, 'currency')) updates.currency = String(input.currency || '').trim().toUpperCase() || DEFAULT_SETTINGS.currency;
  if (Object.prototype.hasOwnProperty.call(input, 'timezone')) updates.timezone = String(input.timezone || '').trim() || DEFAULT_SETTINGS.timezone;
  return updates;
};

const bootstrapProfile = async () => prisma.restaurantProfile.upsert({
  where: { key: DEFAULT_KEY },
  update: {},
  create: {
    key: DEFAULT_KEY,
    restaurantName: DEFAULT_SETTINGS.restaurantName,
    currency: DEFAULT_SETTINGS.currency,
    timezone: DEFAULT_SETTINGS.timezone,
    tables: {
      create: DEFAULT_TABLES.map((t, index) => ({ ...t, sortOrder: index }))
    }
  },
  include: { tables: { orderBy: { sortOrder: 'asc' } } }
});

const getRestaurantSettings = async () => {
  const profile = await bootstrapProfile();
  return mapToSettingsPayload(profile);
};

const updateRestaurantSettings = async (input = {}) => {
  await bootstrapProfile();
  const updates = sanitizeSettingsInput(input);
  
  const profile = await prisma.restaurantProfile.update({
    where: { key: DEFAULT_KEY },
    data: updates,
    include: { tables: { orderBy: { sortOrder: 'asc' } } }
  });
  
  return mapToSettingsPayload(profile);
};

const getSharedFloorPlan = async () => {
  const profile = await bootstrapProfile();
  return mapToFloorPlanPayload(profile);
};

const updateSharedFloorPlan = async (tables = []) => {
  await bootstrapProfile();
  const normalizedTables = normalizeTables(tables);
  
  const [profile] = await prisma.$transaction([
    prisma.restaurantProfile.update({
      where: { key: DEFAULT_KEY },
      data: {
        tables: {
          deleteMany: {},
          create: normalizedTables
        }
      },
      include: { tables: { orderBy: { sortOrder: 'asc' } } }
    })
  ]);
  
  return mapToFloorPlanPayload(profile);
};

module.exports = {
  DEFAULT_SETTINGS,
  DEFAULT_TABLES,
  normalizeTables,
  getRestaurantSettings,
  updateRestaurantSettings,
  getSharedFloorPlan,
  updateSharedFloorPlan,
};
