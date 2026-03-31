const asyncHandler = require('../../core/asyncHandler');
const { getRestaurantSettings, updateRestaurantSettings } = require('./restaurantProfileService');
const { recordAuditEvent } = require('../audit/auditLogService');

const fetchSettings = asyncHandler(async (req, res) => {
  const settings = await getRestaurantSettings();
  res.json(settings);
});

const patchSettings = asyncHandler(async (req, res) => {
  const settings = await updateRestaurantSettings(req.body);

  await recordAuditEvent({
    req,
    action: 'settings.updated',
    entityType: 'RestaurantSettings',
    entityId: settings._id,
    metadata: {
      fields: Object.keys(req.body),
    },
  });

  res.json(settings);
});

module.exports = {
  fetchSettings,
  patchSettings,
};
