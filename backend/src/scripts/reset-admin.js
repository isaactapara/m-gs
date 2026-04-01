/**
 * Temporary script to reset the admin user's password to '1234'.
 * Run with: node src/scripts/reset-admin.js
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetAdmin() {
  const username = 'admin';
  const plainPassword = '1234';
  
  console.log(`🚀 Resetting credentials for user: ${username}...`);
  
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);
    
    // Two-step process for maximum reliability
    let user = await prisma.user.findUnique({ where: { username } });
    
    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { 
          password: hashedPassword,
          isActive: true,
          role: 'owner'
        }
      });
      console.log('✅ Admin user updated!');
    } else {
      user = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          role: 'owner',
          isActive: true
        }
      });
      console.log('✅ Admin user created!');
    }
    
    console.log('---');
    console.log(`Username: ${user.username}`);
    console.log(`New Password: ${plainPassword}`);
    console.log(`Role: ${user.role}`);
    console.log('---');
  } catch (error) {
    console.error('❌ Failed to reset admin credentials:', error.message);
    if (error.code) console.error('ErrorCode:', error.code);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdmin();
