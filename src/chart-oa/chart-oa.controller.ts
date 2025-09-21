import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Param,
  Put,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ChartOaService } from './chart-oa.service';
import {
  ChartAccountFilterDto,
  CreateChartAccountDto,
  UpdateChartAccountDto,
} from './dto/chart.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { AccountType } from 'generated/prisma';
import { SupabaseGuard } from 'src/auth/guards/auth.guard';

@Controller('chart-oa')
export class ChartOaController {
  constructor(
    private readonly chartService: ChartOaService,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  async getChartAccounts(@Query() filters: ChartAccountFilterDto) {
    return this.chartService.findAll(filters);
  }

  @Post('create')
  async create(@Body() payload: CreateChartAccountDto, @Req() req) {
    // Get user ID from the database using Supabase user email
    const user = await this.prisma.user.findUnique({
      where: { email: req.user.email },
      select: { id: true }
    });
    
    if (!user) {
      throw new BadRequestException('User not found in database');
    }
    
    return this.chartService.createAccount(payload, user.id);
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

  @Get('validate-balance-sheet')
  async validateBalanceSheet() {
    return this.chartService.validateBalanceSheet();
  }
}
