import { Controller, Post, Req, Param, Get, Query } from '@nestjs/common';
import { LedgerService } from './ledger.service';

@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Post('setup-account')
  async setupRequiredAcc(@Req() req) {
    return this.ledgerService.ensureRequiredAccountsExist(req.id);
  }

  @Post('customer-invoice/:invoiceId')
  async processCustomerInvoice(
    @Param('invoiceId') invoiceId: string,
    @Req() req,
  ) {
    return this.ledgerService.createCustomerInvoiceEntries(invoiceId, req.id);
  }

  @Get('account/:accountId')
  async getAccountLedger(
    @Param('accountId') accountId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;

    return this.ledgerService.getAccountLedger(accountId, from, to);
  }
}
