import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { UserRole } from 'generated/prisma';
import { Roles } from '../auth/roles.decorator';
import { CreatePaymentDto, UpdatePaymentDto, PaymentFilterDto } from './dto/payments.dto';
import { Request } from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async createPayment(@Body() body: CreatePaymentDto, @Req() req) {
    const userId = req.id || 'system-user-id';
    return this.paymentsService.createPayment(body, userId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async findAllPayments(@Query() query: PaymentFilterDto) {
    return this.paymentsService.findAllPayments(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async findPaymentById(@Param('id') id: string) {
    return this.paymentsService.findPaymentById(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async updatePayment(@Param('id') id: string, @Body() body: UpdatePaymentDto) {
    return this.paymentsService.updatePayment(id, body);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async deletePayment(@Param('id') id: string) {
    return this.paymentsService.deletePayment(id);
  }

  @Get('outstanding/bills')
  @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async getOutstandingBills() {
    return this.paymentsService.getOutstandingBills();
  }

  @Get('outstanding/invoices')
  @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async getOutstandingInvoices() {
    return this.paymentsService.getOutstandingInvoices();
  }
}
