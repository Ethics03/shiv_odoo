import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthService } from './auth/auth.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { RazorpayService } from './razorpay/razorpay.service';
import { RazorpayController } from './razorpay/razorpay.controller';
import { ContactsModule } from './contacts/contacts.module';
import { ProductsModule } from './products/products.module';
import { TaxesModule } from './taxes/taxes.module';
import { PurchaseModule } from './purchase/purchase.module';
import { SalesModule } from './sales/sales.module';
import { PaymentsModule } from './payments/payments.module';
import { ChartOaService } from './chart-oa/chart-oa.service';
import { ChartOaController } from './chart-oa/chart-oa.controller';
import { ChartOaModule } from './chart-oa/chart-oa.module';
import { LedgerService } from './ledger/ledger.service';
import { LedgerController } from './ledger/ledger.controller';
import { ReportsService } from './reports/reports.service';
import { ReportsController } from './reports/reports.controller';
import { CustomerDashboardModule } from './customer-dashboard/customer-dashboard.module';

@Module({
  imports: [PrismaModule, AuthModule, ConfigModule.forRoot({ isGlobal: true }), ContactsModule, ProductsModule, TaxesModule, PurchaseModule, SalesModule, PaymentsModule, ChartOaModule, CustomerDashboardModule],
  controllers: [AppController, RazorpayController, ChartOaController, LedgerController, ReportsController],
  providers: [AppService, PrismaService, AuthService, RazorpayService, ChartOaService, LedgerService, ReportsService],
})
export class AppModule {}
