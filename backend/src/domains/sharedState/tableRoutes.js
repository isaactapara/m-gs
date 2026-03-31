const express = require('express');
const { protect, staffOnly } = require('../../middlewares/auth');
const validateRequest = require('../../middlewares/validateRequest');
const { updateFloorPlanValidators } = require('../../../validators/tableValidators');
const { fetchFloorPlan, putFloorPlan } = require('./tableController');

const router = express.Router();

router.get('/', protect, staffOnly, fetchFloorPlan);
router.put('/', protect, staffOnly, updateFloorPlanValidators, validateRequest, putFloorPlan);

module.exports = router;
