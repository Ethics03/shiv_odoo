const { PrismaClient } = require('./generated/prisma')

async function testDatabase() {
  const prisma = new PrismaClient()
  
  try {
    console.log('Testing database connection...')
    
    // Test basic connection
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    
    // Check if CustomerInvoice table exists by trying to count
    const invoiceCount = await prisma.customerInvoice.count()
    console.log(`✅ CustomerInvoice table exists. Count: ${invoiceCount}`)
    
    // List all tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `
    console.log('📋 Available tables:')
    tables.forEach(table => console.log(`  - ${table.table_name}`))
    
  } catch (error) {
    console.error('❌ Database error:', error.message)
    console.error('Full error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDatabase()

