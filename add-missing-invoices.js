const { PrismaClient } = require('./generated/prisma')

async function addMissingInvoices() {
  const prisma = new PrismaClient()
  
  try {
    console.log('Adding missing invoices...')
    
    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: 'saishankar2803@gmail.com' }
    })
    
    if (!user) {
      console.log('❌ User not found')
      return
    }
    
    // Get the customer
    const customer = await prisma.contact.findFirst({
      where: { email: 'customer@example.com' }
    })
    
    if (!customer) {
      console.log('❌ Customer not found')
      return
    }
    
    // Get the product
    const product = await prisma.product.findFirst({
      where: { name: 'Test Product' }
    })
    
    if (!product) {
      console.log('❌ Product not found')
      return
    }
    
    // Create the missing invoices that the frontend is looking for
    const invoice1 = await prisma.customerInvoice.upsert({
      where: { invoiceNumber: 'INV-2024-0145' },
      update: {},
      create: {
        invoiceNumber: 'INV-2024-0145',
        customerId: customer.id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        totalAmount: 50000.00,
        taxAmount: 9000.00,
        receivedAmount: 0.00,
        status: 'UNPAID',
        notes: 'Test invoice INV-2024-0145',
        createdById: user.id,
        items: {
          create: {
            productId: product.id,
            quantity: 50,
            unitPrice: 1000.00,
            taxRate: 18.00,
            lineTotal: 50000.00
          }
        }
      }
    })
    console.log('✅ Invoice INV-2024-0145 created/found:', invoice1.id)
    
    const invoice2 = await prisma.customerInvoice.upsert({
      where: { invoiceNumber: 'INV-2024-0125' },
      update: {},
      create: {
        invoiceNumber: 'INV-2024-0125',
        customerId: customer.id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        totalAmount: 61250.00,
        taxAmount: 11025.00,
        receivedAmount: 0.00,
        status: 'UNPAID',
        notes: 'Test invoice INV-2024-0125',
        createdById: user.id,
        items: {
          create: {
            productId: product.id,
            quantity: 61,
            unitPrice: 1000.00,
            taxRate: 18.00,
            lineTotal: 61250.00
          }
        }
      }
    })
    console.log('✅ Invoice INV-2024-0125 created/found:', invoice2.id)
    
    console.log('🎉 Missing invoices added successfully!')
    console.log('Total amount for both invoices:', 50000 + 61250, 'rupees')
    
  } catch (error) {
    console.error('❌ Error adding invoices:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addMissingInvoices()

