const mapToSettingsPayload = (profile) => {
  if (!profile) return null;
  return {
    _id: profile.id,
    key: profile.key,
    restaurantName: profile.restaurantName,
    currency: profile.currency,
    timezone: profile.timezone,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
};

const mapToFloorPlanPayload = (profile) => {
  if (!profile) return null;
  return {
    _id: profile.id,
    key: profile.key,
    tables: (profile.tables || []).map((t) => ({
      _id: t.id,
      tableId: t.tableId,
      name: t.name,
      status: t.status,
      position: {
        x: t.positionX,
        y: t.positionY,
      },
    })),
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
};

module.exports = {
  mapToSettingsPayload,
  mapToFloorPlanPayload,
};
