const { PrismaClient } = require('./generated/prisma')

async function cleanupOrders() {
  const prisma = new PrismaClient()
  
  try {
    console.log('Cleaning up existing Razorpay orders...')
    
    // Find and delete existing orders for the specific invoices
    const invoices = ['INV-2024-0145', 'INV-2024-0125']
    
    for (const invoiceNumber of invoices) {
      // Find the invoice
      const invoice = await prisma.customerInvoice.findUnique({
        where: { invoiceNumber },
        include: { razorpayOrder: true }
      })
      
      if (invoice && invoice.razorpayOrder) {
        console.log(`Found existing order for ${invoiceNumber}: ${invoice.razorpayOrder.razorpayId}`)
        
        // Delete the Razorpay order
        await prisma.razorpayOrder.delete({
          where: { id: invoice.razorpayOrder.id }
        })
        
        console.log(`✅ Cleaned up order for ${invoiceNumber}`)
      } else {
        console.log(`No existing order found for ${invoiceNumber}`)
      }
    }
    
    console.log('🎉 Cleanup completed!')
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupOrders()



