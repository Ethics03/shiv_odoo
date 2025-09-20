import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import { PrismaService } from 'src/prisma/prisma.service';
import { CustomerDTO } from './dto/razor.dto';

@Injectable()
export class RazorpayService {
  private razorpay: Razorpay;

  constructor(
    private readonly configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.razorpay = new Razorpay({
      key_id: this.configService.get('RAZORPAY_KEY_ID'),
      key_secret: this.configService.get('RAZORPAY_KEY_SECRET'),
    });
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
}
