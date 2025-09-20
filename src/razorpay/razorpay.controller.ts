import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { RazorpayService } from './razorpay.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto, CustomerDTO } from './dto/razor.dto';
import { Roles } from 'src/auth/roles.decorator';

@Controller('razorpay')
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
      const userId = req.userProfile?.id || req.user.sub;
      const userRole = req.userProfile?.role;
      const userEmail = req.user.email;

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
}
