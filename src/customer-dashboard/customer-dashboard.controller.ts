import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { CustomerDashboardService } from './customer-dashboard.service';
import { SupabaseGuard } from '../auth/guards/auth.guard';

@Controller('customer-dashboard')
// @UseGuards(SupabaseGuard) // Temporarily disabled for testing
export class CustomerDashboardController {
  constructor(private readonly customerDashboardService: CustomerDashboardService) {}

  @Get('metrics')
  async getCustomerMetrics(@Req() req: any) {
    // For testing without auth, use a hardcoded user ID
    const userId = 'cmfs5sdfu0000ox9ezz6cjemu'; // Replace with actual user ID from your database
    return this.customerDashboardService.getCustomerMetrics(userId);
  }

  @Get('invoices')
  async getCustomerInvoices(@Req() req: any) {
    // For testing without auth, use a hardcoded user ID
    const userId = 'cmfs5sdfu0000ox9ezz6cjemu'; // Replace with actual user ID from your database
    return this.customerDashboardService.getCustomerInvoices(userId);
  }
}
