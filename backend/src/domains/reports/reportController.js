const asyncHandler = require('../../core/asyncHandler');
const { getReportSummary, getAllSummaries } = require('./reportService');

const fetchReportSummary = asyncHandler(async (req, res) => {
  const timeframe = ['day', 'week', 'month'].includes(req.query.timeframe)
    ? req.query.timeframe
    : 'week';

  const report = await getReportSummary({
    timeframe,
    user: req.user,
  });

  res.json(report);
});

// Returns all three timeframes in one request — used by the Analytics dashboard
// so it can render three stat cards without three sequential round-trips.
const fetchAllSummaries = asyncHandler(async (req, res) => {
  const report = await getAllSummaries({ user: req.user });
  res.json(report);
});

module.exports = {
  fetchReportSummary,
  fetchAllSummaries,
};
