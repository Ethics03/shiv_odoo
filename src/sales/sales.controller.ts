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
import { SalesService } from './sales.service';
import { UserRole } from 'generated/prisma';
import { Roles } from '../auth/roles.decorator';
import { 
  CreateSalesOrderDto, 
  UpdateSalesOrderDto, 
  UpdateSalesOrderStatusDto, 
  ConvertToInvoiceDto, 
  SalesOrderFilterDto,
  CreateCustomerInvoiceDto,
  UpdateCustomerInvoiceDto,
  UpdateInvoiceStatusDto,
  InvoiceFilterDto
} from './dto/sales.dto';
import { Request } from 'express';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  // Sales Order endpoints
  @Post('orders')
  // @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async createSalesOrder(@Body() body: CreateSalesOrderDto, @Req() req) {
    const userId = req.id || 'system-user-id';
    return this.salesService.createSalesOrder(body, userId);
  }

  @Get('orders')
  // @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async findAllSalesOrders(@Query() query: SalesOrderFilterDto) {
    return this.salesService.findAllSalesOrders(query);
  }

  @Get('orders/:id')
  // @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async findSalesOrderById(@Param('id') id: string) {
    return this.salesService.findSalesOrderById(id);
  }

  @Put('orders/:id')
  // @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async updateSalesOrder(@Param('id') id: string, @Body() body: UpdateSalesOrderDto) {
    return this.salesService.updateSalesOrder(id, body);
  }

  @Put('orders/:id/status')
  // @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async updateSalesOrderStatus(@Param('id') id: string, @Body() body: UpdateSalesOrderStatusDto) {
    return this.salesService.updateSalesOrderStatus(id, body);
  }

  @Get('orders/ready-for-invoice')
  // @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async readyForInvoicing() {
    return this.salesService.readyForInvoicing();
  }

  @Post('orders/:id/convert-to-invoice')
  // @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async convertSalesOrderToInvoice(@Param('id') id: string, @Body() body: ConvertToInvoiceDto, @Req() req) {
    const userId = req.id || 'system-user-id';
    return this.salesService.convertSalesOrderToInvoice(id, body, userId);
  }

  // Customer Invoice endpoints
  @Post('invoices')
  // @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async createCustomerInvoice(@Body() body: CreateCustomerInvoiceDto, @Req() req) {
    const userId = req.id || 'system-user-id';
    return this.salesService.createCustomerInvoice(body, userId);
  }

  @Get('invoices')
  // @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async findAllCustomerInvoices(@Query() query: InvoiceFilterDto) {
    return this.salesService.findAllCustomerInvoices(query);
  }

  @Get('invoices/:id')
  // @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async findCustomerInvoiceById(@Param('id') id: string) {
    return this.salesService.findCustomerInvoiceById(id);
  }

  @Put('invoices/:id')
  // @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async updateCustomerInvoice(@Param('id') id: string, @Body() body: UpdateCustomerInvoiceDto) {
    return this.salesService.updateCustomerInvoice(id, body);
  }

  @Put('invoices/:id/status')
  // @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async updateInvoiceStatus(@Param('id') id: string, @Body() body: UpdateInvoiceStatusDto) {
    return this.salesService.updateInvoiceStatus(id, body);
  }
}
