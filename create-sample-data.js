const { PrismaClient } = require('./generated/prisma')

async function createSampleData() {
  const prisma = new PrismaClient()
  
  try {
    console.log('Creating sample data...')
    
    // First, create a sample user
    const user = await prisma.user.upsert({
      where: { email: 'saishankar2803@gmail.com' },
      update: {},
      create: {
        email: 'saishankar2803@gmail.com',
        name: 'Saishankar',
        loginid: 'saishankar2803',
        role: 'INVOICING_USER'
      }
    })
    console.log('✅ User created/found:', user.email)
    
    // Create a sample customer
    const customer = await prisma.contact.upsert({
      where: { email: 'customer@example.com' },
      update: {},
      create: {
        name: 'Test Customer',
        type: 'CUSTOMER',
        email: 'customer@example.com',
        mobile: '9876543210',
        address: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
        createdById: user.id
      }
    })
    console.log('✅ Customer created/found:', customer.name)
    
    // Create a sample product
    const existingProduct = await prisma.product.findFirst({
      where: { name: 'Test Product' }
    })
    
    let product
    if (existingProduct) {
      product = existingProduct
      console.log('✅ Product found:', product.name)
    } else {
      product = await prisma.product.create({
        data: {
          name: 'Test Product',
          type: 'GOODS',
          salesPrice: 1000.00,
          purchasePrice: 800.00,
          saleTaxRate: 18.00,
          purchaseTaxRate: 18.00,
          hsnCode: '1234',
          category: 'Test Category',
          currentStock: 100,
          createdById: user.id
        }
      })
      console.log('✅ Product created:', product.name)
    }
    
    // Create sample invoices
    const invoice1 = await prisma.customerInvoice.create({
      data: {
        invoiceNumber: 'INV-001',
        customerId: customer.id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        totalAmount: 1180.00,
        taxAmount: 180.00,
        receivedAmount: 0.00,
        status: 'UNPAID',
        notes: 'Test invoice 1',
        createdById: user.id,
        items: {
          create: {
            productId: product.id,
            quantity: 1,
            unitPrice: 1000.00,
            taxRate: 18.00,
            lineTotal: 1180.00
          }
        }
      }
    })
    console.log('✅ Invoice 1 created:', invoice1.invoiceNumber)
    
    const invoice2 = await prisma.customerInvoice.create({
      data: {
        invoiceNumber: 'INV-002',
        customerId: customer.id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        totalAmount: 2360.00,
        taxAmount: 360.00,
        receivedAmount: 0.00,
        status: 'UNPAID',
        notes: 'Test invoice 2',
        createdById: user.id,
        items: {
          create: {
            productId: product.id,
            quantity: 2,
            unitPrice: 1000.00,
            taxRate: 18.00,
            lineTotal: 2360.00
          }
        }
      }
    })
    console.log('✅ Invoice 2 created:', invoice2.invoiceNumber)
    
    console.log('🎉 Sample data created successfully!')
    console.log('Invoice IDs for testing:', [invoice1.id, invoice2.id])
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSampleData()
