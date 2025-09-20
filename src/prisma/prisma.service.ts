import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to database:', error);
      // Set a default DATABASE_URL if not provided
      if (!process.env.DATABASE_URL) {
        process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/nmit_db?schema=public';
        this.logger.warn('Using default DATABASE_URL. Please set DATABASE_URL in your environment variables.');
        try {
          await this.$connect();
          this.logger.log('Database connected with default URL');
        } catch (retryError) {
          this.logger.error('Failed to connect even with default URL:', retryError);
        }
      }
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Database disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting from database:', error);
    }
  }
}
