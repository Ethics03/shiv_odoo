import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
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
  @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async createTax(@Body() body: CreateTaxDTO, @Req() req) {
    return this.taxService.createTax(body, req.id);
  }

  @Delete(':id/delete')
  async updateTax(@Param('id') id: string, @Body() body: UpdateTaxDTO) {
    return await this.taxService.updateTax(id, body);
  }

  @Get(':id')
  async getTaxbyId(@Param('id') id: string) {
    return this.taxService.findTaxbyId(id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async findAll(@Query('search') search?: string) {
    return await this.taxService.findAll(search);
  }
}
