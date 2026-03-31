const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const seed = async () => {
  const adminPin = await bcrypt.hash('3847', 10);
  const cashierPin = await bcrypt.hash('1234', 10);

  await prisma.user.createMany({
    data: [
      { username: 'admin', pin: adminPin, role: 'owner' },
      { username: 'cashier1', pin: cashierPin, role: 'cashier' },
    ],
    skipDuplicates: true,
  });

  await prisma.menuItem.createMany({
    data: [
      { name: 'Mandazi', price: 10, category: 'SNACKS' },
      { name: 'Doughnut', price: 40, category: 'SNACKS' },
      { name: 'Boiled eggs', price: 40, category: 'SNACKS' },
      { name: 'Fried eggs', price: 70, category: 'SNACKS' },
      { name: 'Spanish Omelette', price: 90, category: 'SNACKS' },
      { name: 'Chapati', price: 20, category: 'SNACKS' },
      { name: 'Samosa', price: 40, category: 'SNACKS' },
      { name: 'Sausage', price: 50, category: 'SNACKS' },
      { name: 'Smokie', price: 40, category: 'SNACKS' },
      { name: 'Tea', price: 30, category: 'HOT_BEVERAGES' },
      { name: 'Black coffee', price: 40, category: 'HOT_BEVERAGES' },
      { name: 'White coffee', price: 50, category: 'HOT_BEVERAGES' },
      { name: 'Porridge', price: 40, category: 'HOT_BEVERAGES' },
      { name: 'Ugali cabbage/Sukuma', price: 140, category: 'MAINS' },
      { name: 'Ugali manage', price: 160, category: 'MAINS' },
      { name: 'Ugali Beef', price: 350, category: 'MAINS' },
      { name: 'Ugali Mbuzi', price: 400, category: 'MAINS' },
      { name: 'Ugali Kuku', price: 380, category: 'MAINS' },
      { name: 'Ugali Matumbo', price: 300, category: 'MAINS' },
      { name: 'Ugali maini', price: 340, category: 'MAINS' },
      { name: 'Ugali mix', price: 220, category: 'MAINS' },
      { name: 'Ugali mix kienyeji', price: 250, category: 'MAINS' },
      { name: 'Chapo mix', price: 220, category: 'MAINS' },
      { name: 'Chapo beef', price: 240, category: 'MAINS' },
      { name: 'Chapo mbuzi', price: 290, category: 'MAINS' },
      { name: 'Chapo kuku', price: 250, category: 'MAINS' },
      { name: 'Chapo viazi', price: 140, category: 'MAINS' },
      { name: 'Chapo beans', price: 140, category: 'MAINS' },
      { name: 'Chapo ndengu', price: 150, category: 'MAINS' },
      { name: 'Githeri', price: 130, category: 'MAINS' },
      { name: 'Githeri mix', price: 150, category: 'MAINS' },
      { name: 'Viazi/Ndengu beef', price: 350, category: 'MAINS' },
      { name: 'Beef plain', price: 250, category: 'MAINS' },
      { name: 'Beef fry', price: 300, category: 'MAINS' },
      { name: 'Chips plain', price: 100, category: 'MAINS' },
      { name: 'Chips masala', price: 200, category: 'MAINS' },
      { name: 'Chips paprika', price: 150, category: 'MAINS' },
      { name: 'Loaded fries', price: 400, category: 'MAINS' },
    ],
    skipDuplicates: true,
  });

  console.log('Database seeded successfully.');
  await prisma.$disconnect();
};

seed().catch((e) => {
  console.error('Seeding failed:', e.message);
  process.exit(1);
});
