import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { UserRole } from '@prisma/client';
import { Roles } from 'src/auth/roles.decorator';
import { CreatePurchaseOrderDto } from './dto/purchase.dto';

@Controller('purchase')
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async create(@Body() body: CreatePurchaseOrderDto, @Req() req) {
    return this.purchaseService.create(body, req.id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async findAll(@Query('search') search?: string) {
    return this.purchaseService.findAll(search);
  }

  @Get('ready-for-bill')
  @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async readyForBill() {
    return this.purchaseService.readyForBilling();
  }
}
