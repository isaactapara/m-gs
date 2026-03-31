const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin3847', 10);
  
  const user = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { password: hashedPassword, role: 'owner', isActive: true },
    create: {
      username: 'admin',
      password: hashedPassword,
      role: 'owner',
      isActive: true
    }
  });
  
  console.log('Admin user re-created with password: admin3847');

  // Re-seed some basic menu items using Enum KEYS
  const menuItems = [
    { name: 'Mugwa Chips', price: 150, category: 'SNACKS' },
    { name: 'Beef Stew', price: 350, category: 'MAINS' },
    { name: 'Soda 300ml', price: 70, category: 'DRINKS' },
    { name: 'Black Coffee', price: 50, category: 'HOT_BEVERAGES' },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.create({ data: item });
  }

  console.log('Sample menu items seeded.');
}




main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
