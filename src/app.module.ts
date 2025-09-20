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
import { ContactsService } from './contacts/contacts.service';
import { ContactsController } from './contacts/contacts.controller';
import { ContactsModule } from './contacts/contacts.module';
import { ProductsService } from './products/products.service';
import { ProductsModule } from './products/products.module';

import { TaxesController } from './taxes/taxes.controller';

import { TaxesModule } from './taxes/taxes.module';

@Module({
  imports: [PrismaModule, AuthModule, ConfigModule.forRoot({ isGlobal: true }), ContactsModule, ProductsModule, TaxesModule],
  controllers: [AppController, RazorpayController, ContactsController, TaxesController],
  providers: [AppService, PrismaService, AuthService, RazorpayService, ContactsService, ProductsService],
})
export class AppModule {}
