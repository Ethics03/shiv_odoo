import { Module } from '@nestjs/common';
import { CustomerDashboardController } from './customer-dashboard.controller';
import { CustomerDashboardService } from './customer-dashboard.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CustomerDashboardController],
  providers: [CustomerDashboardService],
})
export class CustomerDashboardModule {}
