const express = require('express');
const { protect, ownerOnly } = require('../../middlewares/auth');
const { fetchReportSummary, fetchAllSummaries } = require('./reportController');

const router = express.Router();

router.get('/summary', protect, ownerOnly, fetchReportSummary);
router.get('/summary/all', protect, ownerOnly, fetchAllSummaries);

module.exports = router;
