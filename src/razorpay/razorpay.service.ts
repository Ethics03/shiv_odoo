import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import { PrismaService } from 'src/prisma/prisma.service';
import { CustomerDTO } from './dto/razor.dto';
import { createHmac } from 'node:crypto';

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

      // ✅ Fix 2: Properly await and handle the response
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
