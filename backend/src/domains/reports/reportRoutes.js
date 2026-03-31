const express = require('express');
const { protect, ownerOnly } = require('../../middlewares/auth');
const { fetchReportSummary } = require('./reportController');

const router = express.Router();

router.get('/summary', protect, ownerOnly, fetchReportSummary);

module.exports = router;
