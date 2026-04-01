const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const REPORT_TIMEZONE = 'Africa/Nairobi';
const SETTLED_STATUSES = ['PAID', 'CONFIRMED'];

const getDateRange = (timeframe) => {
  const nairobiString = new Date().toLocaleString('en-US', { timeZone: REPORT_TIMEZONE });
  const end = new Date(nairobiString);
  const start = new Date(nairobiString);

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

async function testQuery(timeframe) {
  const range = getDateRange(timeframe);
  const cashierId = null;
  console.log(`Testing timeframe: ${timeframe}`, range);

  try {
    if (timeframe === 'day') {
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
      console.log(`Day query successful, found ${rows.length} rows`);
    } else if (timeframe === 'month') {
      const rows = await prisma.$queryRaw`
        SELECT
          LEAST(
            FLOOR(
              (
                (created_at AT TIME ZONE ${REPORT_TIMEZONE})::date
                - (${range.start} AT TIME ZONE ${REPORT_TIMEZONE})::date
              ) / 7
            ),
            3
          )::int AS week_num,
          COALESCE(SUM(total), 0)::float8 AS total_sales
        FROM bills
        WHERE
          created_at >= ${range.start}
          AND created_at <= ${range.end}
          AND status IN ('PAID', 'CONFIRMED')
          AND (${cashierId}::text IS NULL OR cashier_id = ${cashierId}::text)
        GROUP BY week_num
        ORDER BY week_num
      `;
      console.log(`Month query successful, found ${rows.length} rows`);
    } else {
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
      console.log(`Week query successful, found ${rows.length} rows`);
    }
  } catch (error) {
    console.error(`Query failed for timeframe ${timeframe}:`);
    console.error(error.message);
    if (error.code) console.error(`Error Code: ${error.code}`);
  }
}

async function main() {
  await testQuery('day');
  await testQuery('week');
  await testQuery('month');
  await prisma.$disconnect();
}

main();
