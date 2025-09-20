import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Param,
  Put,
} from '@nestjs/common';
import { ChartOaService } from './chart-oa.service';
import {
  ChartAccountFilterDto,
  CreateChartAccountDto,
  UpdateChartAccountDto,
} from './dto/chart.dto';

import { AccountType } from 'generated/prisma';

@Controller('chart-oa')
export class ChartOaController {
  constructor(private readonly chartService: ChartOaService) {}

  @Get()
  async getChartAccounts(@Query() filters: ChartAccountFilterDto) {
    return this.chartService.findAll(filters);
  }

  @Post('create')
  async create(@Body() payload: CreateChartAccountDto, @Req() req) {
    return this.chartService.createAccount(payload, req.id);
  }

  @Get('type/:type')
  async getByType(@Param('type') type: AccountType) {
    return this.chartService.getByType(type);
  }

  @Get(':id/balance')
  async getAccountBalance(@Param('id') id: string) {
    return this.chartService.getAccountBalance(id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.chartService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAccountDto: UpdateChartAccountDto,
  ) {
    return this.chartService.update(id, updateAccountDto);
  }

  @Put(':id/archive')
  async archive(@Param('id') id: string) {
    return this.chartService.archive(id);
  }
}
