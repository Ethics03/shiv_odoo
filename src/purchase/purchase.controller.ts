import { Body, Controller, Get, Post, Put, Query, Req, Param } from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { UserRole } from '@prisma/client';
import { Roles } from 'src/auth/roles.decorator';
import { CreatePurchaseOrderDto, ConvertToBillDto, UpdatePurchaseOrderStatusDto } from './dto/purchase.dto';

@Controller('purchase')
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async create(@Body() body: CreatePurchaseOrderDto, @Req() req) {
    const userId = req.id || 'system-user-id';
    return this.purchaseService.create(body, userId);
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

  @Put(':id/status')
  @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async updateStatus(@Param('id') id: string, @Body() body: UpdatePurchaseOrderStatusDto) {
    return this.purchaseService.updateStatus(id, body.status);
  }

  @Post(':id/convert-to-bill')
  @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async convertToBill(@Param('id') id: string, @Body() body: ConvertToBillDto, @Req() req) {
    const userId = req.id || 'system-user-id';
    return this.purchaseService.convertToBill(id, body, userId);
  }
}
