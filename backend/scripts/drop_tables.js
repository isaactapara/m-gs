const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log(`🚮 Starting 'Clean Slate' Manual Table Drop Protocol...`);

  // Use raw queries over the connection pooler (Port 6543)
  // This bypasses the blocked Port 5432.
  
  const tables = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public';
  `;

  if (tables.length === 0) {
    console.log('✅ No tables found in the public schema. Database is already empty.');
    return;
  }

  console.log(`🧹 Dropping ${tables.length} tables...`);

  // Drop all tables in one go using CASCADE to handle foreign key dependencies
  for (const { tablename } of tables) {
    console.log(`   - Dropping table "${tablename}"...`);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${tablename}" CASCADE;`);
  }

  // Also drop any enums if they exist
  const enums = await prisma.$queryRaw`
    SELECT t.typname FROM pg_type t 
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = 'public' AND t.typtype = 'e';
  `;

  for (const { typname } of enums) {
    console.log(`   - Dropping enum "${typname}"...`);
    await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "${typname}" CASCADE;`);
  }

  console.log(`✅ 'Clean Slate' Manual Drop Protocol successful.`);
}

main()
  .catch((e) => {
    console.error('❌ Table drop failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
