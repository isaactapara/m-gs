const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting secure seed protocol...');

  // 1. Hash the default Master Owner password
  // PASSWORD: Admin@1234!
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('Admin@1234!', salt);

  // 2. Upsert the Master Owner account
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      password: hashedPassword,
      role: 'owner',
      isActive: true,
    },
    create: {
      username: 'admin',
      password: hashedPassword,
      role: 'owner',
      isActive: true,
    },
  });

  console.log('✅ Master Owner "admin" upserted successfully.');

  // 3. Upsert the default Restaurant Profile
  const profile = await prisma.restaurantProfile.upsert({
    where: { key: 'default' },
    update: {},
    create: {
      key: 'default',
      restaurantName: "M&G's",
      currency: 'KSH',
      timezone: 'Africa/Nairobi',
    },
  });

  console.log('✅ Default Restaurant Profile upserted successfully.');
  console.log('🏁 Seed protocol complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
