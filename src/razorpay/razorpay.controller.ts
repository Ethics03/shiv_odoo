import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RazorpayService } from './razorpay.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateOrderDto,
  CustomerDTO,
  CreateMultiOrderDto,
  VerifyPaymentDto,
} from './dto/razor.dto';
import { Roles } from 'src/auth/roles.decorator';
import { SupabaseGuard } from 'src/auth/guards/auth.guard';

@Controller('razorpay')
// @UseGuards(SupabaseGuard)
export class RazorpayController {
  logger = new Logger(RazorpayController.name);
  constructor(
    private razorpayService: RazorpayService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('create-test-customer')
  async createTestCustomer() {
    try {
      const testCustomer: CustomerDTO = {
        name: 'John Doe',
        email: `john${Date.now()}@shivfurniture.com`,
        contact: '9876543210',
      };

      const result = await this.razorpayService.createCustomer(testCustomer);

      return {
        success: true,
        message: 'Test customer created successfully!',
        customerId: result.id,
        customerDetails: result,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Test failed',
        error: error.message,
        stack: error.stack,
      };
    }
  }

  @Get('config')
  @Roles('ADMIN', 'INVOICING_USER', 'CONTACT_USER')
  getConfig() {
    try {
      const config = this.razorpayService.getRazorpayConfig();
      return {
        success: true,
        data: config,
      };
    } catch (error) {
      this.logger.error(`Failed to get config: ${error.message}`);
      throw new BadRequestException('Failed to get Razorpay configuration');
    }
  }

  @Post('create-order')
  @Roles('ADMIN', 'INVOICING_USER', 'CONTACT_USER')
  async createPaymentOrder(@Body() createOrderDto: CreateOrderDto, @Req() req) {
    try {
      const userId = req.user.sub;
      const userEmail = req.user.email;

      // Get user profile from database
      const userProfile = await this.prisma.user.findUnique({
        where: { email: userEmail },
      });

      const userRole = userProfile?.role;

      this.logger.log(
        `User ${userEmail} (${userRole}) creating order for invoice ${createOrderDto.invoiceId}`,
      );

      // Security check: CONTACT_USER can only pay their own invoices
      if (userRole === 'CONTACT_USER') {
        const invoice = await this.prisma.customerInvoice.findUnique({
          where: { id: createOrderDto.invoiceId },
          include: { customer: true },
        });

        if (!invoice) {
          throw new BadRequestException('Invoice not found');
        }

        if (invoice.customer.email !== userEmail) {
          this.logger.warn(
            `Contact user ${userEmail} tried to pay invoice belonging to ${invoice.customer.email}`,
          );
          throw new BadRequestException(
            'You can only create payment orders for your own invoices',
          );
        }

        this.logger.log(
          `Contact user verified: ${userEmail} owns invoice ${invoice.invoiceNumber}`,
        );
      }

      // Create the payment order
      const result = await this.razorpayService.createOrderForInvoice(
        createOrderDto.invoiceId,
        userId,
      );

      // Return formatted response
      return {
        success: true,
        message: result.isExisting
          ? 'Payment order already exists and retrieved successfully'
          : 'Payment order created successfully',
        data: {
          // Razorpay order details (for frontend)
          order: result.order,

          // Invoice information
          invoice: {
            id: result.invoice.id,
            invoiceNumber: result.invoice.invoiceNumber,
            totalAmount: result.invoice.totalAmount,
            receivedAmount: result.invoice.receivedAmount,
            pendingAmount:
              Number(result.invoice.totalAmount) -
              Number(result.invoice.receivedAmount),
            status: result.invoice.status,
            description:
              result.invoice.notes ||
              `Payment for Invoice ${result.invoice.invoiceNumber}`,
            invoiceDate: result.invoice.invoiceDate,
            dueDate: result.invoice.dueDate,
          },

          // Customer information (for Razorpay prefill)
          customer: {
            name: result.customer.name,
            email: result.customer.email,
            mobile: result.customer.mobile,
          },

          // Razorpay configuration (for frontend integration)
          razorpay_key: this.razorpayService.getRazorpayConfig().key,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to create payment order: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  @Post('create-multi-order')
  // @Roles('ADMIN', 'INVOICING_USER', 'CONTACT_USER')
  async createMultiPaymentOrder(
    @Body() createMultiOrderDto: CreateMultiOrderDto,
    @Req() req,
  ) {
    try {
      const userId = req.user?.sub || 'system-user-id';
      const userEmail = req.user?.email || 'system@example.com';

      // Get user profile from database
      const userProfile = await this.prisma.user.findUnique({
        where: { email: userEmail },
      });

      const userRole = userProfile?.role;

      // Determine if this is for invoices or bills
      const isInvoicePayment = createMultiOrderDto.invoiceIds && createMultiOrderDto.invoiceIds.length > 0;
      const isBillPayment = createMultiOrderDto.billIds && createMultiOrderDto.billIds.length > 0;

      if (!isInvoicePayment && !isBillPayment) {
        throw new BadRequestException('Either invoiceIds or billIds must be provided');
      }

      if (isInvoicePayment && isBillPayment) {
        throw new BadRequestException('Cannot process both invoices and bills in the same order');
      }

      this.logger.log(
        `User ${userEmail} (${userRole}) creating multi-order for ${isInvoicePayment ? createMultiOrderDto.invoiceIds!.length : createMultiOrderDto.billIds!.length} ${isInvoicePayment ? 'invoices' : 'bills'}`,
      );

      // Security check: CONTACT_USER can only pay their own invoices
      if (userRole === 'CONTACT_USER' && isInvoicePayment) {
        const invoices = await this.prisma.customerInvoice.findMany({
          where: { invoiceNumber: { in: createMultiOrderDto.invoiceIds } },
          include: { customer: true },
        });

        for (const invoice of invoices) {
          if (invoice.customer.email !== userEmail) {
            throw new BadRequestException(
              'You can only create payment orders for your own invoices',
            );
          }
        }
      }

      // Create the multi-payment order
      const result = isInvoicePayment 
        ? await this.razorpayService.createOrderForMultipleInvoices(
            createMultiOrderDto.invoiceIds!,
            userId,
            createMultiOrderDto.amount,
          )
        : await this.razorpayService.createOrderForMultipleBills(
            createMultiOrderDto.billIds!,
            userId,
            createMultiOrderDto.amount,
          );

      // Calculate totals
      const totalAmount = isInvoicePayment 
        ? (result as any).invoices.reduce((sum: number, inv: any) => sum + Number(inv.totalAmount), 0)
        : (result as any).bills.reduce((sum: number, bill: any) => sum + Number(bill.totalAmount), 0);
      
      const totalReceived = isInvoicePayment
        ? (result as any).invoices.reduce((sum: number, inv: any) => sum + Number(inv.receivedAmount), 0)
        : (result as any).bills.reduce((sum: number, bill: any) => sum + Number(bill.receivedAmount), 0);

      return {
        success: true,
        message: `Multi-${isInvoicePayment ? 'invoice' : 'bill'} payment order created successfully`,
        data: {
          // Razorpay order details
          order: result.order,

          // Summary
          summary: {
            totalItems: isInvoicePayment ? (result as any).invoices.length : (result as any).bills.length,
            totalAmount,
            totalReceived,
            pendingAmount: totalAmount - totalReceived,
            itemNumbers: isInvoicePayment 
              ? (result as any).invoices.map((inv: any) => inv.invoiceNumber)
              : (result as any).bills.map((bill: any) => bill.billNumber),
          },

          // Individual item details
          items: isInvoicePayment 
            ? (result as any).invoices.map((invoice: any) => ({
                id: invoice.id,
                itemNumber: invoice.invoiceNumber,
                totalAmount: invoice.totalAmount,
                receivedAmount: invoice.receivedAmount,
                pendingAmount: Number(invoice.totalAmount) - Number(invoice.receivedAmount),
                status: invoice.status,
                itemDate: invoice.invoiceDate,
                dueDate: invoice.dueDate,
              }))
            : (result as any).bills.map((bill: any) => ({
                id: bill.id,
                itemNumber: bill.billNumber,
                totalAmount: bill.totalAmount,
                receivedAmount: bill.receivedAmount,
                pendingAmount: Number(bill.totalAmount) - Number(bill.receivedAmount),
                status: bill.status,
                itemDate: bill.invoiceDate,
                dueDate: bill.dueDate,
              })),

          // Contact information
          contact: {
            name: (result as any).customer?.name || (result as any).vendor?.name,
            email: (result as any).customer?.email || (result as any).vendor?.email,
            mobile: (result as any).customer?.mobile || (result as any).vendor?.mobile,
          },

          // Razorpay configuration
          razorpay_key: this.razorpayService.getRazorpayConfig().key,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to create multi-invoice payment order: ${error.message}`,
      );
      throw new BadRequestException(error.message);
    }
  }

  @Post('verify-payment')
  @Roles('ADMIN', 'INVOICING_USER', 'CONTACT_USER')
  async verifyPayment(@Body() verifyPaymentDto: VerifyPaymentDto, @Req() req) {
    try {
      const userId = req.user.sub;

      // Verify payment and update invoice
      const result = await this.razorpayService.verifyPaymentAndUpdateInvoice(
        verifyPaymentDto.razorpay_order_id,
        verifyPaymentDto.razorpay_payment_id,
        verifyPaymentDto.razorpay_signature,
        userId,
      );

      return {
        success: true,
        message: 'Payment verified and processed successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error(`Payment verification failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  @Post('cleanup-orders')
  @Roles('ADMIN', 'INVOICING_USER')
  async cleanupAbandonedOrders(@Req() req) {
    try {
      const result = await this.razorpayService.cleanupAbandonedOrders();

      return {
        success: true,
        message: 'Cleanup completed',
        data: result,
      };
    } catch (error) {
      this.logger.error(`Cleanup failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }
}
