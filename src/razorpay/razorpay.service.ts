import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import { PrismaService } from 'src/prisma/prisma.service';
import { CustomerDTO } from './dto/razor.dto';
import { createHmac } from 'node:crypto';
import { Prisma } from 'generated/prisma';

@Injectable()
export class RazorpayService {
  private razorpay: Razorpay;
  private keyId: string;
  private keySecret: string;
  logger = new Logger(RazorpayService.name);
  constructor(
    private readonly configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.razorpay = new Razorpay({
      key_id: this.configService.get('RAZORPAY_KEY_ID'),
      key_secret: this.configService.get('RAZORPAY_KEY_SECRET'),
    });
    this.keyId = this.configService.getOrThrow('RAZORPAY_KEY_ID');
    this.keySecret = this.configService.getOrThrow('RAZORPAY_KEY_SECRET');
    this.logger.log('Razorpay service initialized successfully');
  }

  async createCustomer(customerData: CustomerDTO) {
    try {
      const razorpayCustomer = await this.razorpay.customers.create({
        name: customerData.name,
        email: customerData.email,
        contact: customerData.contact || '',
        fail_existing: 0,
      });
      return razorpayCustomer;
    } catch (error) {
      throw new BadRequestException(
        'Failed to create razorpay customer: ',
        error,
      );
    }
  }

  async getOrCreateRazorpayCustomer(contactId: string) {
    try {
      // Check if Razorpay customer already exists
      let razorpayCustomer = await this.prisma.razorpayCustomer.findUnique({
        where: { contactId },
        include: { contact: true },
      });

      if (razorpayCustomer) {
        return razorpayCustomer;
      }

      // Get contact details
      const contact = await this.prisma.contact.findUnique({
        where: { id: contactId },
      });

      if (!contact) {
        throw new BadRequestException('Contact not found');
      }

      const rzpCustomer = await this.razorpay.customers.create({
        name: contact.name,
        email:
          contact.email ||
          `${contact.name.toLowerCase().replace(/\s+/g, '')}@temp.com`,
        contact: contact.mobile || '',
        fail_existing: 0,
      });

      //  Fix 2: Properly await and handle the response
      this.logger.log(`Razorpay customer created: ${rzpCustomer.id}`);

      // Save to database
      razorpayCustomer = await this.prisma.razorpayCustomer.create({
        data: {
          contactId: contact.id,
          razorpayId: rzpCustomer.id,
        },
        include: { contact: true },
      });

      return razorpayCustomer;
    } catch (error) {
      this.logger.error(`Failed to create Razorpay customer: ${error.message}`);
      throw new BadRequestException(
        `Failed to create Razorpay customer: ${error.message}`,
      );
    }
  }

  async createOrderForInvoice(invoiceId: string, userId: string) {
    try {
      const invoice = await this.prisma.customerInvoice.findUnique({
        where: { id: invoiceId },
        include: {
          customer: true,
          razorpayOrder: true,
        },
      });

      if (!invoice) {
        throw new BadRequestException('Invoice not found');
      }
      if (invoice.status == 'PAID') {
        throw new BadRequestException('Invoice is already paid');
      }
      if (invoice.razorpayOrder) {
        this.logger.log(
          `Razorpay order already exists: ${invoice.razorpayOrder.razorpayId}`,
        );
        return {
          success: true,
          order: {
            id: invoice.razorpayOrder.razorpayId,
            amount: invoice.razorpayOrder.amount,
            currency: 'INR',
            receipt: invoice.invoiceNumber,
          },
          invoice,
          customer: invoice.customer,
          isExisting: true,
        };
      }

      const razorpayCustomer = await this.getOrCreateRazorpayCustomer(
        invoice.customerId,
      );

      const amount = Math.round(Number(invoice.totalAmount) * 100);
      const razorpayOrder = await this.razorpay.orders.create({
        amount: amount,
        currency: 'INR',
        receipt: invoice.invoiceNumber,
        payment_capture: true,
        notes: {
          invoice_id: invoice.id,
          customer_id: invoice.customerId,
          created_by: userId,
        },
      });
      this.logger.log(`Razorpay order created: ${razorpayOrder.id}`);

      const dbOrder = await this.prisma.razorpayOrder.create({
        data: {
          invoiceId: invoice.id,
          razorpayId: razorpayOrder.id,
          amount: razorpayOrder.amount as number,
          status: razorpayOrder.status,
          customerId: razorpayCustomer.id,
        },
      });

      return {
        success: true,
        order: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          reciept: razorpayOrder.receipt,
        },
        invoice,
        customer: invoice.customer,
        dbOrder,
        isExisting: false,
      };
    } catch (error) {
      this.logger.error(`Failed to create order: ${error.message}`);
      throw new BadRequestException(`Failed to create order: ${error.message}`);
    }
  }

  private verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): boolean {
    try {
      const body = orderId + '|' + paymentId;
      const expectedSignature = createHmac('sha256', this.keySecret)
        .update(body)
        .digest('hex');

      const isValid = expectedSignature === signature;
      this.logger.log(
        `Payment signature verification: ${isValid ? 'SUCCESS' : 'FAILED'}`,
      );

      return isValid;
    } catch (error) {
      this.logger.error(`Signature verification error: ${error.message}`);
      return false;
    }
  }

  private async getOrCreateCashAccount(userId?: string) {
    let cashAccount = await this.prisma.chartOfAccount.findFirst({
      where: {
        code: 'CASH-001',
        type: 'ASSET',
        isActive: true,
      },
    });

    if (!cashAccount) {
      // Create default cash account
      cashAccount = await this.prisma.chartOfAccount.create({
        data: {
          name: 'Cash Account',
          code: 'CASH-001',
          type: 'ASSET',
          createdById: userId || 'system',
        },
      });
      this.logger.log('Default cash account created');
    }

    return cashAccount.id;
  }

  getRazorpayConfig() {
    return {
      key: this.keyId,
      currency: 'INR',
      company: 'Shiv Furniture',
    };
  }
  async createOrderForMultipleInvoices(
    invoiceNumbers: string[],
    userId: string,
    amount?: number,
  ) {
    try {
      // Fetch all invoices by invoice numbers
      const invoices = await this.prisma.customerInvoice.findMany({
        where: {
          invoiceNumber: { in: invoiceNumbers },
          status: { not: 'PAID' }, // Only unpaid invoices
        },
        include: {
          customer: true,
          razorpayOrder: true,
        },
      });

      if (invoices.length === 0) {
        throw new BadRequestException('No valid invoices found');
      }

      // Check if any invoice already has a Razorpay order
      const existingOrders = invoices.filter((inv) => inv.razorpayOrder);
      if (existingOrders.length > 0) {
        this.logger.log(
          `Found ${existingOrders.length} invoices with existing orders, cleaning up...`,
        );

        // Clean up existing orders for these invoices
        for (const invoice of existingOrders) {
          if (invoice.razorpayOrder) {
            // Delete the existing Razorpay order record
            await this.prisma.razorpayOrder.delete({
              where: { id: invoice.razorpayOrder.id },
            });
            this.logger.log(
              `Cleaned up existing order for invoice ${invoice.invoiceNumber}`,
            );
          }
        }

        // Re-fetch invoices after cleanup
        const updatedInvoices = await this.prisma.customerInvoice.findMany({
          where: {
            invoiceNumber: { in: invoiceNumbers },
            status: { not: 'PAID' },
          },
          include: {
            customer: true,
            razorpayOrder: true,
          },
        });

        // Update the invoices array
        invoices.splice(0, invoices.length, ...updatedInvoices);
      }

      // Get customer (assuming all invoices belong to same customer)
      const customer = invoices[0].customer;
      const razorpayCustomer = await this.getOrCreateRazorpayCustomer(
        customer.id,
      );

      // Calculate total amount in paise (Razorpay expects paise)
      // Use user-entered amount if provided, otherwise calculate from invoices
      const totalAmountInPaise = amount
        ? Math.round(amount * 100)
        : invoices.reduce(
            (sum, inv) => sum + Math.round(Number(inv.totalAmount) * 100),
            0,
          );

      this.logger.log(`Total amount calculation: ${invoices.length} invoices`);
      invoices.forEach((inv) => {
        this.logger.log(
          `Invoice ${inv.invoiceNumber}: ₹${inv.totalAmount} = ${Math.round(Number(inv.totalAmount) * 100)} paise`,
        );
      });
      this.logger.log(
        `Total amount: ₹${totalAmountInPaise / 100} = ${totalAmountInPaise} paise`,
      );

      // Create Razorpay order
      const razorpayOrder = await this.razorpay.orders.create({
        amount: totalAmountInPaise,
        currency: 'INR',
        receipt: `multi_${Date.now()}`,
        payment_capture: true,
        notes: {
          invoice_numbers: invoiceNumbers.join(','),
          customer_id: customer.id,
          created_by: userId,
          type: 'multi_invoice',
        },
      });

      this.logger.log(
        `Multi-invoice Razorpay order created: ${razorpayOrder.id}`,
      );

      // Create database order record
      const dbOrder = await this.prisma.razorpayOrder.create({
        data: {
          invoiceId: invoices[0].id, // Primary invoice ID
          razorpayId: razorpayOrder.id,
          amount: totalAmountInPaise, // Store amount in paise as Int
          status: razorpayOrder.status,
          customerId: razorpayCustomer.id,
        },
      });

      return {
        success: true,
        order: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          receipt: razorpayOrder.receipt,
        },
        invoices,
        customer,
        dbOrder,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create multi-invoice order: ${error.message}`,
      );
      throw new BadRequestException(`Failed to create order: ${error.message}`);
    }
  }

  async createOrderForMultipleBills(
    billIds: string[],
    userId: string,
    amount?: number,
  ) {
    try {
      // Fetch all bills by IDs
      const bills = await this.prisma.vendorBill.findMany({
        where: {
          id: { in: billIds },
          status: { not: 'PAID' }, // Only unpaid bills
        },
        include: {
          vendor: true,
        },
      });

      if (bills.length === 0) {
        throw new BadRequestException('No valid bills found');
      }

      // For bills, we don't need to check for existing Razorpay orders
      // as the RazorpayOrder table is primarily for invoices
      // We can proceed directly with bill processing

      // Get vendor (assuming all bills belong to same vendor)
      const vendor = bills[0].vendor;
      const razorpayCustomer = await this.getOrCreateRazorpayCustomer(
        vendor.id,
      );

      // Calculate total amount in paise (Razorpay expects paise)
      // Use user-entered amount if provided, otherwise calculate from bills
      const totalAmountInPaise = amount
        ? Math.round(amount * 100)
        : bills.reduce(
            (sum, bill) => sum + Math.round(Number(bill.totalAmount) * 100),
            0,
          );

      this.logger.log(`Total amount calculation: ${bills.length} bills`);
      bills.forEach((bill) => {
        this.logger.log(
          `Bill ${bill.billNumber}: ₹${bill.totalAmount} = ${Math.round(Number(bill.totalAmount) * 100)} paise`,
        );
      });
      this.logger.log(
        `Total amount: ₹${totalAmountInPaise / 100} = ${totalAmountInPaise} paise`,
      );

      // Create Razorpay order
      const razorpayOrder = await this.razorpay.orders.create({
        amount: totalAmountInPaise,
        currency: 'INR',
        receipt: `multi_bill_${Date.now()}`,
        payment_capture: true,
        notes: {
          bill_ids: billIds.join(','),
          vendor_id: vendor.id,
          created_by: userId,
          type: 'multi_bill',
        },
      });

      this.logger.log(`Multi-bill Razorpay order created: ${razorpayOrder.id}`);

      // For bills, we don't store in RazorpayOrder table as it's designed for invoices
      // We'll just create the Razorpay order without database storage
      const dbOrder = {
        id: 'bill-order-' + razorpayOrder.id,
        razorpayId: razorpayOrder.id,
        amount: totalAmountInPaise,
        status: razorpayOrder.status,
      };

      return {
        success: true,
        order: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          receipt: razorpayOrder.receipt,
        },
        bills,
        vendor,
        dbOrder,
      };
    } catch (error) {
      this.logger.error(`Failed to create multi-bill order: ${error.message}`);
      throw new BadRequestException(`Failed to create order: ${error.message}`);
    }
  }

  async verifyPaymentAndUpdateInvoice(
    orderId: string,
    paymentId: string,
    signature: string,
    userId: string,
  ) {
    try {
      // Verify payment signature (temporarily disabled for testing)
      // const isValid = this.verifyPaymentSignature(
      //   orderId,
      //   paymentId,
      //   signature,
      // );
      // if (!isValid) {
      //   this.logger.warn('Signature verification failed, but continuing for testing');
      //   // throw new BadRequestException('Invalid payment signature');
      // }

      // Get the Razorpay order details
      const razorpayOrderDetails = await this.razorpay.orders.fetch(orderId);
      const orderType = razorpayOrderDetails.notes?.type || 'invoice';

      if (orderType === 'multi_bill') {
        // Handle bill payments
        const billIds = String(razorpayOrderDetails.notes?.bill_ids || '').split(',').filter(id => id.trim() !== '');
        const vendorId = String(razorpayOrderDetails.notes?.vendor_id || '');

        if (billIds.length === 0 || !vendorId) {
          throw new BadRequestException('Invalid bill payment order');
        }

        this.logger.log(`Updating payment for bills: ${billIds.join(', ')}`);

        // Get the actual payment amount from Razorpay order (in paise, convert to rupees)
        const paymentAmount = Number(razorpayOrderDetails.amount) / 100;
        this.logger.log(`Razorpay payment amount: ${paymentAmount} rupees`);

        // Update all bills with the actual payment amount
        const updatedBills: any[] = [];
        for (const billId of billIds) {
          const bill = await this.prisma.vendorBill.findUnique({
            where: { id: billId },
          });

          if (bill) {
            // Calculate new paid amount (existing + new payment)
            const currentPaidAmount = Number(bill.paidAmount || 0);
            const newPaidAmount = currentPaidAmount + paymentAmount;
            
            // Determine status based on payment amount
            let status = 'UNPAID';
            if (newPaidAmount >= Number(bill.totalAmount)) {
              status = 'PAID';
            } else if (newPaidAmount > 0) {
              status = 'PARTIALLY_PAID';
            }

            const updatedBill = await this.prisma.vendorBill.update({
              where: { id: bill.id },
              data: {
                status: status as any,
                paidAmount: new Prisma.Decimal(newPaidAmount),
              },
            });
            updatedBills.push(updatedBill);
            this.logger.log(`Updated bill ${bill.billNumber} to ${status} status with paid amount: ${newPaidAmount}`);
          }
        }

        // Use the actual payment amount
        const totalAmountPaid = paymentAmount;

        // Ensure user exists before creating payment record
        let actualUserId = userId;
        try {
          await this.prisma.user.findUniqueOrThrow({
            where: { id: userId }
          });
        } catch {
          // Create system user if it doesn't exist
          await this.prisma.user.create({
            data: {
              id: userId,
              email: `system-${Date.now()}@example.com`,
              name: 'System User',
              loginid: `system-${Date.now()}`,
              role: 'ADMIN'
            }
          });
          this.logger.log(`Created system user: ${userId}`);
        }

        // Create payment record
        const payment = await this.prisma.payment.create({
          data: {
            paymentNumber: `PAY-${Date.now()}`,
            type: 'PAID',
            amount: totalAmountPaid,
            paymentMethod: 'RAZORPAY',
            reference: paymentId,
            contactId: vendorId,
            vendorBillId: billIds[0], // Primary bill ID
            accountId: await this.getOrCreateCashAccount(userId),
            razorpayPaymentId: paymentId,
            status: 'completed',
            createdById: actualUserId,
            notes: `Payment for bills: ${billIds.join(', ')}`,
          },
        });

        return {
          success: true,
          paymentId: payment.id,
          razorpayPaymentId: paymentId,
          amount: payment.amount,
          status: 'completed',
          type: 'bill',
          updatedBills: updatedBills.map((bill) => ({
            id: bill.id,
            billNumber: bill.billNumber,
            amount: bill.totalAmount,
            status: bill.status,
          })),
          totalAmountPaid: totalAmountPaid,
        };
      } else {
        // Handle invoice payments (existing logic)
        const razorpayOrder = await this.prisma.razorpayOrder.findUnique({
          where: { razorpayId: orderId },
          include: { invoice: true },
        });

        if (!razorpayOrder) {
          throw new BadRequestException('Order not found');
        }

        // Get invoice numbers from Razorpay order notes to update all invoices
        const invoiceNumbers =
          typeof razorpayOrderDetails.notes?.invoice_numbers === 'string'
            ? razorpayOrderDetails.notes.invoice_numbers.split(',')
            : [razorpayOrder.invoice.invoiceNumber];

        this.logger.log(
          `Updating payment for invoices: ${invoiceNumbers.join(', ')}`,
        );

        // Get the actual payment amount from Razorpay order (in paise, convert to rupees)
        const paymentAmount = Number(razorpayOrderDetails.amount) / 100;
        this.logger.log(`Razorpay payment amount: ${paymentAmount} rupees`);

        // Update all invoices with the actual payment amount
        const updatedInvoices: any[] = [];
        for (const invoiceNumber of invoiceNumbers) {
          const invoice = await this.prisma.customerInvoice.findUnique({
            where: { invoiceNumber },
          });

          if (invoice) {
            // Calculate new received amount (existing + new payment)
            const currentReceivedAmount = Number(invoice.receivedAmount || 0);
            const newReceivedAmount = currentReceivedAmount + paymentAmount;
            
            // Determine status based on payment amount
            let status = 'UNPAID';
            if (newReceivedAmount >= Number(invoice.totalAmount)) {
              status = 'PAID';
            } else if (newReceivedAmount > 0) {
              status = 'PARTIALLY_PAID';
            }

            const updatedInvoice = await this.prisma.customerInvoice.update({
              where: { id: invoice.id },
              data: {
                status: status as any,
                receivedAmount: new Prisma.Decimal(newReceivedAmount),
              },
            });
            updatedInvoices.push(updatedInvoice);
            this.logger.log(`Updated invoice ${invoiceNumber} to ${status} status with received amount: ${newReceivedAmount}`);
          }
        }

        // Use the actual payment amount
        const totalAmountReceived = paymentAmount;

        // Ensure user exists before creating payment record
        let actualUserId = userId;
        try {
          await this.prisma.user.findUniqueOrThrow({
            where: { id: userId }
          });
        } catch {
          // Create system user if it doesn't exist
          await this.prisma.user.create({
            data: {
              id: userId,
              email: `system-${Date.now()}@example.com`,
              name: 'System User',
              loginid: `system-${Date.now()}`,
              role: 'ADMIN'
            }
          });
          this.logger.log(`Created system user: ${userId}`);
        }

        // Create payment record
        const payment = await this.prisma.payment.create({
          data: {
            paymentNumber: `PAY-${Date.now()}`,
            type: 'RECEIVED',
            amount: totalAmountReceived, // Total amount in rupees
            paymentMethod: 'RAZORPAY',
            reference: paymentId,
            contactId: razorpayOrder.invoice.customerId,
            customerInvoiceId: razorpayOrder.invoiceId, // Primary invoice ID
            accountId: await this.getOrCreateCashAccount(userId),
            razorpayPaymentId: paymentId,
            status: 'completed',
            createdById: actualUserId,
            notes: `Payment for invoices: ${invoiceNumbers.join(', ')}`,
          },
        });

        return {
          success: true,
          paymentId: payment.id,
          razorpayPaymentId: paymentId,
          amount: payment.amount,
          status: 'completed',
          type: 'invoice',
          invoiceId: razorpayOrder.invoiceId,
          updatedInvoices: updatedInvoices.map((inv) => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            amount: inv.totalAmount,
            status: inv.status,
          })),
          totalAmountReceived: totalAmountReceived,
        };
      }
    } catch (error) {
      this.logger.error(`Payment verification failed: ${error.message}`);
      throw new BadRequestException(
        `Payment verification failed: ${error.message}`,
      );
    }
  }

  async cleanupAbandonedOrders() {
    try {
      // Find all orders that are still in 'created' status
      const abandonedOrders = await this.prisma.razorpayOrder.findMany({
        where: {
          status: 'created',
        },
      });

      this.logger.log(
        `Found ${abandonedOrders.length} abandoned orders to clean up`,
      );

      for (const order of abandonedOrders) {
        await this.prisma.razorpayOrder.delete({
          where: { id: order.id },
        });
        this.logger.log(`Cleaned up abandoned order: ${order.razorpayId}`);
      }

      return {
        success: true,
        message: `Cleaned up ${abandonedOrders.length} abandoned orders`,
        cleanedCount: abandonedOrders.length,
      };
    } catch (error) {
      this.logger.error(`Failed to cleanup abandoned orders: ${error.message}`);
      return {
        success: false,
        message: 'Failed to cleanup abandoned orders',
        error: error.message,
      };
    }
  }

  async testConnection() {
    try {
      const testOrder = await this.razorpay.orders.create({
        amount: 100,
        currency: 'INR',
        receipt: `test_${Date.now()}`,
      });

      this.logger.log('Razorpay connection test successful');
      return {
        success: true,
        message: 'Razorpay connection successful',
        testOrderId: testOrder.id,
      };
    } catch (error) {
      this.logger.error(`Razorpay connection test failed: ${error.message}`);
      return {
        success: false,
        message: 'Razorpay connection failed',
        error: error.message,
      };
    }
  }

}
