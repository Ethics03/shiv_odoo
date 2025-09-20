#!/usr/bin/env node

const { PrismaClient } = require('./generated/prisma');

async function setupDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔌 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully!');
    
    console.log('📊 Checking if database is initialized...');
    const userCount = await prisma.user.count();
    console.log(`👥 Found ${userCount} users in database`);
    
    const productCount = await prisma.product.count();
    console.log(`📦 Found ${productCount} products in database`);
    
    if (userCount === 0) {
      console.log('⚠️  No users found. You may need to create a user account.');
    }
    
    if (productCount === 0) {
      console.log('📝 No products found. You can create products through the admin dashboard.');
    }
    
    console.log('🎉 Database setup complete!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Make sure PostgreSQL is running: brew services start postgresql');
    console.log('2. Create the database: createdb nmit_db');
    console.log('3. Run migrations: npx prisma migrate deploy');
    console.log('4. Set DATABASE_URL in .env file');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupDatabase();
