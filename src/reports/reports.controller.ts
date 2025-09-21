import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Response } from 'express';

@Controller('reports')
export class ReportsController {
  constructor(private readonly pdfService: ReportsService) {}

  @Get('invoice/:invoiceNumber')
  async generateInvoicePDF(@Param('invoiceNumber') invoiceNumber: string, @Res() res: Response) {
    return this.pdfService.generateInvoicePDF(invoiceNumber, res);
  }

  @Get('purchase-order/:id')
  async generatePurchaseOrderPDF(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return this.pdfService.generatePurchaseOrderPDF(id, res);
  }

  @Get('profit-loss')
  async generateProfitLossReport(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Res() res: Response,
  ) {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    return this.pdfService.generateProfitLossReport(from, to, res);
  }

  @Get('balance-sheet')
  async generateBalanceSheet(
    @Query('asOfDate') asOfDate: string,
    @Res() res: Response,
  ) {
    const date = asOfDate ? new Date(asOfDate) : new Date();
    return this.pdfService.generateBalanceSheet(date, res);
  }
}
