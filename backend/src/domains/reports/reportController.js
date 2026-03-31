const asyncHandler = require('../../core/asyncHandler');
const { getReportSummary } = require('./reportService');

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

module.exports = {
  fetchReportSummary,
};
