const prisma = require('../../config/prisma');

const SETTLED_STATUSES = ['PAID', 'CONFIRMED'];

// Canonical timezone for all date bucketing in PostgreSQL.
// All timestamps stored as UTC in Postgres are shifted to local
// time before any EXTRACT / DATE_TRUNC operation runs.
const REPORT_TIMEZONE = 'Africa/Nairobi';

// ---------------------------------------------------------------------------
// Date range helpers
// ---------------------------------------------------------------------------

const getDateRange = (timeframe) => {
  const now = new Date();
  const REPORT_TIMEZONE = 'Africa/Nairobi';

  // 1. Get Nairobi's current date string (YYYY-MM-DD)
  const nairobiDateStr = now.toLocaleDateString('en-CA', { timeZone: REPORT_TIMEZONE });
  let targetDateStr = nairobiDateStr;

  // 2. Safely calculate week/month boundaries using an anchored +03:00 Date object
  if (timeframe === 'month' || timeframe === 'week') {
    const anchoredDate = new Date(`${nairobiDateStr}T00:00:00+03:00`);
    
    if (timeframe === 'month') {
      anchoredDate.setUTCDate(1);
    } else {
      anchoredDate.setUTCDate(anchoredDate.getUTCDate() - 6);
    }
    
    // Extract the corrected YYYY-MM-DD string back out, strictly in Nairobi time
    targetDateStr = anchoredDate.toLocaleDateString('en-CA', { timeZone: REPORT_TIMEZONE });
  }

  // 3. Final UTC start point anchored directly to Nairobi's offset
  const start = new Date(`${targetDateStr}T00:00:00+03:00`);
  
  const labels = { day: 'Today', month: 'This Month', week: 'Last 7 Days' };
  return { 
    start, 
    end: now, 
    label: labels[timeframe] || labels.week 
  };
};

// ---------------------------------------------------------------------------
// buildTrend — all aggregation delegated to PostgreSQL via $queryRaw.
//
// Node.js performs ONLY:
//   1. Filling empty scaffold slots with zero (O(K) where K ∈ {7, 12, 4}).
//   2. Date-to-string label formatting for the response shape.
// No financial summation occurs in Node.js memory.
//
// Security note: REPORT_TIMEZONE and SETTLED_STATUSES are code constants,
// never derived from user input. All user-supplied values (range.start,
// range.end, cashierId) are bound parameters — Prisma's $queryRaw template
// tag parameterises every ${expression}, preventing SQL injection.
// ---------------------------------------------------------------------------

const buildTrend = async (timeframe, range, cashierId) => {

  // Reusable null-check pattern that avoids a conditional SQL branch.
  // Postgres evaluates ($1::text IS NULL OR cashier_id = $1::text) in the
  // query planner; when cashierId is null, the cashier_id predicate is
  // short-circuited and the index on (created_at, cashier_id) still fires.
  //
  // status is hardcoded to the two settled constants — not user-supplied.

  if (timeframe === 'day') {
    // Group settled bills into 2-hour slots (00:00, 02:00 … 22:00).
    // FLOOR(EXTRACT(HOUR) / 2) produces slot indices 0–11.
    const rows = await prisma.$queryRaw`
      SELECT
        FLOOR(EXTRACT(HOUR FROM created_at AT TIME ZONE ${REPORT_TIMEZONE}) / 2)::int AS slot,
        COALESCE(SUM(total), 0)::float8 AS total_sales
      FROM bills
      WHERE
        created_at >= ${range.start}
        AND created_at <= ${range.end}
        AND status IN ('PAID', 'CONFIRMED')
        AND (${cashierId}::text IS NULL OR cashier_id = ${cashierId}::text)
      GROUP BY slot
      ORDER BY slot
    `;

    // O(12) scaffold fill — no financial math.
    return Array.from({ length: 12 }, (_, slot) => {
      const match = rows.find((r) => Number(r.slot) === slot);
      return {
        key: slot,
        label: `${String(slot * 2).padStart(2, '0')}:00`,
        totalSales: match ? Number(match.total_sales) : 0,
      };
    });
  }

  // Default: 'week' or 'month' (daily trend)
  // group by local calendar day.
  const rows = await prisma.$queryRaw`
    SELECT
      (created_at AT TIME ZONE ${REPORT_TIMEZONE})::date AS day,
      COALESCE(SUM(total), 0)::float8 AS total_sales
    FROM bills
    WHERE
      created_at >= ${range.start}
      AND created_at <= ${range.end}
      AND status IN ('PAID', 'CONFIRMED')
      AND (${cashierId}::text IS NULL OR cashier_id = ${cashierId}::text)
    GROUP BY day
    ORDER BY day
  `;

  // Normalise Postgres date values to ISO-10 strings for comparison.
  const toIso10 = (d) =>
    d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);

  // O(7) or O(30) scaffold fill — no financial math.
  return Array.from({ length: timeframe === 'month' ? 30 : 7 }, (_, i) => {
    // Use explicit millisecond addition (86400000ms = 1 day) from the absolute range.start
    const day = new Date(range.start.getTime() + (i * 86400000));
    
    // Format to Nairobi ISO string (YYYY-MM-DD) for database matching
    const isoDate = day.toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
    const match = rows.find((r) => toIso10(r.day) === isoDate);
    
    return {
      key: i,
      label: day.toLocaleDateString('en-US', { 
        timeZone: 'Africa/Nairobi',
        weekday: timeframe === 'month' ? undefined : 'short',
        day: 'numeric',
        month: 'short'
      }),
      isoDate,
      totalSales: match ? Number(match.total_sales) : 0,
    };
  });
};

// ---------------------------------------------------------------------------
// getReportSummary — public API consumed by reportController.
// ---------------------------------------------------------------------------

const getReportSummary = async ({ timeframe = 'week', user }) => {
  const range = getDateRange(timeframe);
  const cashierId = user && user.role !== 'owner'
    ? String(user.id || user._id)
    : null;

  // Prisma ORM where clause — used for prisma.bill.aggregate only.
  const where = {
    createdAt: { gte: range.start, lte: range.end },
    status: { in: SETTLED_STATUSES },
    ...(cashierId ? { cashierId } : {}),
  };

  // Single DB round-trip.  PostgreSQL sums the Decimal column natively;
  // Node.js receives a single numeric result — no O(N) reduce.
  const aggregate = await prisma.bill.aggregate({
    where,
    _sum: { total: true },
    _count: { id: true },
  });

  const summary = {
    totalSales: Number(aggregate._sum.total ?? 0),
    billCount: aggregate._count.id,
  };

  // Active users — a separate lightweight query, not joined to bills.
  const activeThreshold = new Date(Date.now() - 2 * 60 * 1000);
  const activeUsers = await prisma.user.findMany({
    where: { lastActiveAt: { gte: activeThreshold } },
    select: { username: true },
  });

  return {
    timeframe,
    range,
    summary: {
      ...summary,
      activeUsersCount: activeUsers.length,
      activeUsernames: activeUsers.map((u) => u.username),
    },
    trend: await buildTrend(timeframe, range, cashierId),
  };
};

// ---------------------------------------------------------------------------
// getAllSummaries — fires all three timeframes concurrently.
// The Analytics dashboard calls /summary/all once on load and receives
// day, week, and month summaries in a single HTTP response.
// ---------------------------------------------------------------------------

const getAllSummaries = async ({ user }) => {
  const [day, week, month] = await Promise.all([
    getReportSummary({ timeframe: 'day',   user }),
    getReportSummary({ timeframe: 'week',  user }),
    getReportSummary({ timeframe: 'month', user }),
  ]);

  return { day, week, month };
};

module.exports = {
  getReportSummary,
  getAllSummaries,
  SETTLED_STATUSES,
};
