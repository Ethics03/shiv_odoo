import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import PDFDocument from 'pdfkit';
import { Response } from 'express';
@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async generateInvoicePDF(invoiceId: string, res: Response) {
    const invoice = await this.prisma.customerInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        items: { include: { product: true } },
        createdBy: { select: { name: true } },
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`,
    );

    // Pipe PDF to response
    doc.pipe(res);

    // Header
    doc.fontSize(20).text('SHIV FURNITURE', 50, 50);
    doc.fontSize(12).text('Invoice', 50, 80);

    // Invoice details
    doc.text(`Invoice #: ${invoice.invoiceNumber}`, 50, 120);
    doc.text(`Date: ${invoice.invoiceDate.toDateString()}`, 50, 140);
    doc.text(`Due Date: ${invoice.dueDate.toDateString()}`, 50, 160);

    // Customer details
    doc.text('Bill To:', 50, 200);
    doc.text(`${invoice.customer.name}`, 50, 220);
    if (invoice.customer.email) doc.text(`${invoice.customer.email}`, 50, 240);
    if (invoice.customer.mobile)
      doc.text(`${invoice.customer.mobile}`, 50, 260);

    // Items table header
    const tableTop = 320;
    doc.text('Item', 50, tableTop);
    doc.text('Qty', 200, tableTop);
    doc.text('Price', 250, tableTop);
    doc.text('Tax %', 300, tableTop);
    doc.text('Total', 400, tableTop);

    // Draw line
    doc
      .moveTo(50, tableTop + 20)
      .lineTo(500, tableTop + 20)
      .stroke();

    // Items
    let itemY = tableTop + 40;
    let subtotal = 0;

    invoice.items.forEach((item) => {
      const lineTotal = Number(item.lineTotal);
      subtotal += lineTotal;

      doc.text(item.product.name, 50, itemY);
      doc.text(item.quantity.toString(), 200, itemY);
      doc.text(`₹${Number(item.unitPrice).toFixed(2)}`, 250, itemY);
      doc.text(`${Number(item.taxRate)}%`, 300, itemY);
      doc.text(`₹${lineTotal.toFixed(2)}`, 400, itemY);

      itemY += 25;
    });

    // Totals
    const totalsY = itemY + 20;
    doc.moveTo(300, totalsY).lineTo(500, totalsY).stroke();

    doc.text('Subtotal:', 350, totalsY + 10);
    doc.text(`₹${subtotal.toFixed(2)}`, 450, totalsY + 10);

    doc.text('Tax:', 350, totalsY + 30);
    doc.text(`₹${Number(invoice.taxAmount).toFixed(2)}`, 450, totalsY + 30);

    doc.fontSize(14).text('Total:', 350, totalsY + 50);
    doc.text(`₹${Number(invoice.totalAmount).toFixed(2)}`, 450, totalsY + 50);

    // Footer
    doc.fontSize(10).text('Thank you for your business!', 50, totalsY + 100);

    doc.end();
  }

  // ✅ Generate Purchase Order PDF
  async generatePurchaseOrderPDF(poId: string, res: Response) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: {
        vendor: true,
        items: { include: { product: true } },
      },
    });

    if (!po) {
      throw new Error('Purchase Order not found');
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=po-${po.orderNumber}.pdf`,
    );

    doc.pipe(res);

    // Header
    doc.fontSize(20).text('SHIV FURNITURE', 50, 50);
    doc.fontSize(12).text('Purchase Order', 50, 80);

    // PO details
    doc.text(`PO #: ${po.orderNumber}`, 50, 120);
    doc.text(`Date: ${po.orderDate.toDateString()}`, 50, 140);
    doc.text(`Status: ${po.status}`, 50, 160);

    // Vendor details
    doc.text('Vendor:', 50, 200);
    doc.text(`${po.vendor.name}`, 50, 220);
    if (po.vendor.email) doc.text(`${po.vendor.email}`, 50, 240);
    if (po.vendor.mobile) doc.text(`${po.vendor.mobile}`, 50, 260);

    // Items table
    const tableTop = 320;
    doc.text('Item', 50, tableTop);
    doc.text('Qty', 200, tableTop);
    doc.text('Price', 250, tableTop);
    doc.text('Tax %', 300, tableTop);
    doc.text('Total', 400, tableTop);

    doc
      .moveTo(50, tableTop + 20)
      .lineTo(500, tableTop + 20)
      .stroke();

    let itemY = tableTop + 40;
    po.items.forEach((item) => {
      doc.text(item.product.name, 50, itemY);
      doc.text(item.quantity.toString(), 200, itemY);
      doc.text(`₹${Number(item.unitPrice).toFixed(2)}`, 250, itemY);
      doc.text(`${Number(item.taxRate)}%`, 300, itemY);
      doc.text(`₹${Number(item.lineTotal).toFixed(2)}`, 400, itemY);
      itemY += 25;
    });

    // Total
    const totalsY = itemY + 20;
    doc.moveTo(300, totalsY).lineTo(500, totalsY).stroke();
    doc.fontSize(14).text('Total:', 350, totalsY + 10);
    doc.text(`₹${Number(po.totalAmount).toFixed(2)}`, 450, totalsY + 10);

    doc.end();
  }

  // ✅ Generate Profit & Loss Report PDF
  async generateProfitLossReport(fromDate: Date, toDate: Date, res: Response) {
    // Get income and expense data
    const [incomePayments, expensePayments] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          account: { type: 'INCOME' },
          createdAt: { gte: fromDate, lte: toDate },
        },
        include: {
          account: { select: { name: true } },
          contact: { select: { name: true } },
        },
      }),
      this.prisma.payment.findMany({
        where: {
          account: { type: 'EXPENSE' },
          createdAt: { gte: fromDate, lte: toDate },
        },
        include: {
          account: { select: { name: true } },
          contact: { select: { name: true } },
        },
      }),
    ]);

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=profit-loss-${fromDate.toISOString().split('T')[0]}-to-${toDate.toISOString().split('T')[0]}.pdf`,
    );

    doc.pipe(res);

    // Header
    doc.fontSize(20).text('SHIV FURNITURE', 50, 50);
    doc.fontSize(16).text('Profit & Loss Statement', 50, 80);
    doc
      .fontSize(12)
      .text(
        `From: ${fromDate.toDateString()} To: ${toDate.toDateString()}`,
        50,
        110,
      );

    let currentY = 150;

    // INCOME SECTION
    doc.fontSize(14).text('INCOME', 50, currentY);
    currentY += 30;

    let totalIncome = 0;
    incomePayments.forEach((payment) => {
      const amount = Math.abs(Number(payment.amount)); // Income is negative in payments
      totalIncome += amount;
      doc.fontSize(10).text(`${payment.account.name}`, 70, currentY);
      doc.text(`₹${amount.toFixed(2)}`, 400, currentY);
      currentY += 20;
    });

    doc.moveTo(70, currentY).lineTo(450, currentY).stroke();
    doc.fontSize(12).text('Total Income:', 300, currentY + 10);
    doc.text(`₹${totalIncome.toFixed(2)}`, 400, currentY + 10);
    currentY += 40;

    // EXPENSES SECTION
    doc.fontSize(14).text('EXPENSES', 50, currentY);
    currentY += 30;

    let totalExpenses = 0;
    expensePayments.forEach((payment) => {
      const amount = Number(payment.amount);
      totalExpenses += amount;
      doc.fontSize(10).text(`${payment.account.name}`, 70, currentY);
      doc.text(`₹${amount.toFixed(2)}`, 400, currentY);
      currentY += 20;
    });

    doc.moveTo(70, currentY).lineTo(450, currentY).stroke();
    doc.fontSize(12).text('Total Expenses:', 300, currentY + 10);
    doc.text(`₹${totalExpenses.toFixed(2)}`, 400, currentY + 10);
    currentY += 40;

    // NET PROFIT
    const netProfit = totalIncome - totalExpenses;
    doc.moveTo(50, currentY).lineTo(500, currentY).stroke();
    doc.fontSize(16).text('NET PROFIT:', 300, currentY + 15);
    doc.text(`₹${netProfit.toFixed(2)}`, 400, currentY + 15);

    doc.end();
  }

  // ✅ Generate Balance Sheet PDF
  async generateBalanceSheet(asOfDate: Date, res: Response) {
    const [assets, liabilities, equity] = await Promise.all([
      this.prisma.payment.groupBy({
        by: ['accountId'],
        where: {
          account: { type: 'ASSET' },
          createdAt: { lte: asOfDate },
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.groupBy({
        by: ['accountId'],
        where: {
          account: { type: 'LIABILITY' },
          createdAt: { lte: asOfDate },
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.groupBy({
        by: ['accountId'],
        where: {
          account: { type: 'EQUITY' },
          createdAt: { lte: asOfDate },
        },
        _sum: { amount: true },
      }),
    ]);

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=balance-sheet-${asOfDate.toISOString().split('T')[0]}.pdf`,
    );

    doc.pipe(res);

    // Header
    doc.fontSize(20).text('SHIV FURNITURE', 50, 50);
    doc.fontSize(16).text('Balance Sheet', 50, 80);
    doc.fontSize(12).text(`As of: ${asOfDate.toDateString()}`, 50, 110);

    let currentY = 150;

    // Assets
    doc.fontSize(14).text('ASSETS', 50, currentY);
    currentY += 30;

    let totalAssets = 0;
    for (const asset of assets) {
      const account = await this.prisma.chartOfAccount.findUnique({
        where: { id: asset.accountId },
      });
      const amount = Number(asset._sum.amount) || 0;
      totalAssets += amount;

      doc.fontSize(10).text(`${account?.name}`, 70, currentY);
      doc.text(`₹${amount.toFixed(2)}`, 400, currentY);
      currentY += 20;
    }

    doc.moveTo(70, currentY).lineTo(450, currentY).stroke();
    doc.fontSize(12).text('Total Assets:', 300, currentY + 10);
    doc.text(`₹${totalAssets.toFixed(2)}`, 400, currentY + 10);

    doc.end();
  }
}
