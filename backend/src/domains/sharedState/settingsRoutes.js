const express = require('express');
const { protect, ownerOnly } = require('../../middlewares/auth');
const validateRequest = require('../../middlewares/validateRequest');
const { updateSettingsValidators } = require('../../../validators/settingsValidators');
const { fetchSettings, patchSettings } = require('./settingsController');

const router = express.Router();

router.get('/', protect, fetchSettings);
router.patch('/', protect, ownerOnly, updateSettingsValidators, validateRequest, patchSettings);

module.exports = router;
