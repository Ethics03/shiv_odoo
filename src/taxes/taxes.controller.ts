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
import { TaxesService } from './taxes.service';
import { UserRole } from 'generated/prisma';
import { CreateTaxDTO, UpdateTaxDTO } from './dto/taxes.dto';
import { Roles } from 'src/auth/roles.decorator';
import { Request } from 'express';

@Controller('taxes')
export class TaxesController {
  constructor(private readonly taxService: TaxesService) {}

  @Post()
  async createTax(@Body() body: CreateTaxDTO, @Req() req) {
    // For testing, use a default user ID
    const userId = req.id || 'test-user-id';
    return this.taxService.createTax(body, userId);
  }

  @Put(':id')
  async updateTax(@Param('id') id: string, @Body() body: UpdateTaxDTO) {
    return await this.taxService.updateTax(id, body);
  }

  @Get(':id')
  async getTaxbyId(@Param('id') id: string) {
    return this.taxService.findTaxbyId(id);
  }

  @Get()
  async findAll(@Query('search') search?: string) {
    return await this.taxService.findAll(search);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async deleteTax(@Param('id') id: string) {
    return await this.taxService.removeTax(id);
  }
}
