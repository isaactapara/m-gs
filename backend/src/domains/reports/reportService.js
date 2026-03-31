const prisma = require('../../config/prisma');

const SETTLED_STATUSES = ['PAID', 'CONFIRMED'];

const getDateRange = (timeframe) => {
  const end = new Date();
  const start = new Date(end);

  if (timeframe === 'day') {
    start.setHours(0, 0, 0, 0);
    return { start, end, label: 'Today' };
  }

  if (timeframe === 'month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return { start, end, label: 'This Month' };
  }

  start.setDate(end.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return { start, end, label: 'Last 7 Days' };
};

const buildTrend = (timeframe, bills) => {
  const now = new Date();
  const trend = [];

  if (timeframe === 'day') {
    for (let slot = 0; slot < 12; slot += 1) {
      trend.push({
        key: slot,
        label: `${String(slot * 2).padStart(2, '0')}:00`,
        settledRevenue: 0,
        pendingTotal: 0,
      });
    }

    bills.forEach((bill) => {
      const billDate = new Date(bill.createdAt);
      if (billDate.toDateString() !== now.toDateString()) return;

      const bucket = Math.floor(billDate.getHours() / 2);
      if (!trend[bucket]) return;

      const total = Number(bill.total) || 0;

      if (SETTLED_STATUSES.includes(bill.status)) {
        trend[bucket].settledRevenue += total;
      } else if (bill.status === 'PENDING') {
        trend[bucket].pendingTotal += total;
      }
    });

    return trend;
  }

  if (timeframe === 'month') {
    for (let week = 0; week < 4; week += 1) {
      trend.push({
        key: week,
        label: `Week ${week + 1}`,
        settledRevenue: 0,
        pendingTotal: 0,
      });
    }

    bills.forEach((bill) => {
      const billDate = new Date(bill.createdAt);
      const diffDays = Math.floor((now - billDate) / (1000 * 60 * 60 * 24));
      if (diffDays < 0 || diffDays >= 28) return;

      const bucket = 3 - Math.floor(diffDays / 7);
      if (!trend[bucket]) return;

      const total = Number(bill.total) || 0;

      if (SETTLED_STATUSES.includes(bill.status)) {
        trend[bucket].settledRevenue += total;
      } else if (bill.status === 'PENDING') {
        trend[bucket].pendingTotal += total;
      }
    });

    return trend;
  }

  for (let dayOffset = 6; dayOffset >= 0; dayOffset -= 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - dayOffset);
    trend.push({
      key: dayOffset,
      label: day.toLocaleDateString('en-US', { weekday: 'short' }),
      isoDate: day.toISOString().slice(0, 10),
      settledRevenue: 0,
      pendingTotal: 0,
    });
  }

  bills.forEach((bill) => {
    const billDate = new Date(bill.createdAt);
    const diffDays = Math.floor((now - billDate) / (1000 * 60 * 60 * 24));
    if (diffDays < 0 || diffDays >= 7) return;

    const bucket = 6 - diffDays;
    if (!trend[bucket]) return;

    const total = Number(bill.total) || 0;

    if (SETTLED_STATUSES.includes(bill.status)) {
      trend[bucket].settledRevenue += total;
    } else if (bill.status === 'PENDING') {
      trend[bucket].pendingTotal += total;
    }
  });

  return trend;
};

const getReportSummary = async ({ timeframe = 'week', user }) => {
  const range = getDateRange(timeframe);
  const filter = {
    createdAt: { gte: range.start, lte: range.end },
  };

  if (user && user.role !== 'owner') {
    filter.cashierId = String(user.id || user._id);
  }

  const bills = await prisma.bill.findMany({
    where: filter,
    orderBy: { createdAt: 'desc' },
  });

  const summary = bills.reduce((acc, bill) => {
    const total = Number(bill.total) || 0;
    
    if (SETTLED_STATUSES.includes(bill.status)) {
      acc.settledRevenue += total;
      acc.settledCount += 1;
    } else if (bill.status === 'PENDING') {
      acc.pendingTotal += total;
      acc.pendingCount += 1;
    } else if (bill.status === 'FAILED' || bill.status === 'CANCELLED') {
      acc.failedTotal += total;
      acc.failedCount += 1;
    } else if (bill.status === 'PARTIAL_PAYMENT_FLAGGED') {
      acc.anomalyTotal += total;
      acc.anomalyCount += 1;
    }

    return acc;
  }, {
    settledRevenue: 0,
    pendingTotal: 0,
    failedTotal: 0,
    anomalyTotal: 0,
    settledCount: 0,
    pendingCount: 0,
    failedCount: 0,
    anomalyCount: 0,
  });

  return {
    timeframe,
    range,
    summary,
    trend: buildTrend(timeframe, bills),
  };
};

module.exports = {
  getReportSummary,
  SETTLED_STATUSES,
};
