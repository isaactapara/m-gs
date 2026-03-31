const asyncHandler = require('../../core/asyncHandler');
const { getSharedFloorPlan, updateSharedFloorPlan } = require('./restaurantProfileService');
const { recordAuditEvent } = require('../audit/auditLogService');

const fetchFloorPlan = asyncHandler(async (req, res) => {
  const floorPlan = await getSharedFloorPlan();
  res.json(floorPlan);
});

const putFloorPlan = asyncHandler(async (req, res) => {
  const floorPlan = await updateSharedFloorPlan(req.body.tables);

  await recordAuditEvent({
    req,
    action: 'floor_plan.updated',
    entityType: 'FloorPlan',
    entityId: floorPlan._id,
    metadata: {
      tableCount: floorPlan.tables ? floorPlan.tables.length : 0,
    },
  });

  res.json(floorPlan);
});

module.exports = {
  fetchFloorPlan,
  putFloorPlan,
};
