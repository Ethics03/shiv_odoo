import { Controller, Get } from '@nestjs/common';
import { RazorpayService } from './razorpay.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CustomerDTO } from './dto/razor.dto';

@Controller('razorpay')
export class RazorpayController {
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
}
