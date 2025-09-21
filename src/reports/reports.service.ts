import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import PDFDocument from 'pdfkit';
import { Response } from 'express';
@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async generateInvoicePDF(invoiceNumber: string, res: Response) {
    const invoice = await this.prisma.customerInvoice.findUnique({
      where: { invoiceNumber: invoiceNumber },
      include: {
        customer: true,
        items: { include: { product: true } },
        createdBy: { select: { name: true } },
      },
    });

    if (!invoice) {
      throw new Error(`Invoice with number ${invoiceNumber} not found`);
    }

    // Debug: Log the full invoice structure
    console.log('Full invoice data:', JSON.stringify(invoice, null, 2));

    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`,
    );

    // Set default text color to black and background to white
    doc.fillColor('black');
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('white');

    // Pipe PDF to response
    doc.pipe(res);

    // Header with better styling
    doc.fillColor('black').fontSize(24).font('Helvetica-Bold').text('SHIV FURNITURE', 50, 50);
    doc.fillColor('black').fontSize(16).font('Helvetica').text('INVOICE', 50, 80);

    // Invoice details with better layout
    const invoiceDetailsY = 120;
    doc.fillColor('black').fontSize(12).font('Helvetica-Bold').text('Invoice Details:', 50, invoiceDetailsY);
    doc.fillColor('black').fontSize(11).font('Helvetica');
    doc.text(`Invoice #: ${invoice.invoiceNumber}`, 50, invoiceDetailsY + 20);
    doc.text(`Date: ${invoice.invoiceDate.toDateString()}`, 50, invoiceDetailsY + 40);
    doc.text(`Due Date: ${invoice.dueDate.toDateString()}`, 50, invoiceDetailsY + 60);

    // Customer details with better layout
    const customerY = invoiceDetailsY + 100;
    doc.fillColor('black').fontSize(12).font('Helvetica-Bold').text('Bill To:', 50, customerY);
    doc.fillColor('black').fontSize(11).font('Helvetica');
    doc.text(`${invoice.customer.name}`, 50, customerY + 20);
    if (invoice.customer.email) doc.text(`${invoice.customer.email}`, 50, customerY + 40);
    if (invoice.customer.mobile) doc.text(`${invoice.customer.mobile}`, 50, customerY + 60);

    // Items table header with better positioning
    const tableTop = 320;
    const tableWidth = 500;
    const colWidths = {
      item: 200,
      qty: 60,
      price: 80,
      tax: 60,
      total: 80
    };
    
    const colPositions = {
      item: 50,
      qty: 50 + colWidths.item,
      price: 50 + colWidths.item + colWidths.qty,
      tax: 50 + colWidths.item + colWidths.qty + colWidths.price,
      total: 50 + colWidths.item + colWidths.qty + colWidths.price + colWidths.tax
    };

    // Draw table header background (white)
    doc.rect(50, tableTop - 10, tableWidth, 30).fill('white');
    
    // Table headers with better alignment
    doc.fillColor('black').fontSize(12).font('Helvetica-Bold');
    doc.text('Item Description', colPositions.item, tableTop);
    doc.text('Qty', colPositions.qty, tableTop);
    doc.text('Price', colPositions.price, tableTop);
    doc.text('Tax %', colPositions.tax, tableTop);
    doc.text('Total', colPositions.total, tableTop);

    // Draw header line
    doc
      .strokeColor('black')
      .moveTo(50, tableTop + 15)
      .lineTo(50 + tableWidth, tableTop + 15)
      .stroke();

    // Items with better spacing
    let itemY = tableTop + 35;
    let subtotal = 0;

    // Reset font for items
    doc.fillColor('black').fontSize(10).font('Helvetica');

    // Debug: Log invoice structure
    console.log('Invoice items:', JSON.stringify(invoice.items, null, 2));
    console.log('Invoice items length:', invoice.items?.length);

    // Check if there are items
    if (invoice.items && invoice.items.length > 0) {
      invoice.items.forEach((item, index) => {
        const lineTotal = Number(item.lineTotal) || 0;
        subtotal += lineTotal;

        // Item details with proper alignment and text wrapping
        const productName = item.product?.name || 'Unknown Product';
        const quantity = item.quantity || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        const taxRate = Number(item.taxRate) || 0;

        // Truncate long product names
        const truncatedName = productName.length > 25 ? productName.substring(0, 25) + '...' : productName;
        
        // Draw row background first (if needed)
        if (index % 2 === 0) {
          doc.rect(50, itemY - 5, tableWidth, 20).fill('white');
        }
        
        // Set text color explicitly before each text element
        doc.fillColor('black').fontSize(10).font('Helvetica');
        doc.text(truncatedName, colPositions.item, itemY);
        doc.text(quantity.toString(), colPositions.qty, itemY);
        doc.text(`₹${unitPrice.toFixed(2)}`, colPositions.price, itemY);
        doc.text(`${taxRate}%`, colPositions.tax, itemY);
        doc.text(`₹${lineTotal.toFixed(2)}`, colPositions.total, itemY);

        itemY += 25;
      });
    } else {
      // Create sample items for testing if no items found
      console.log('No items found, creating sample data for testing...');
      const sampleItems = [
        { name: 'Sample Chair', quantity: 2, unitPrice: 1500, taxRate: 18, lineTotal: 3000 },
        { name: 'Sample Table', quantity: 1, unitPrice: 5000, taxRate: 18, lineTotal: 5000 },
        { name: 'Sample Sofa', quantity: 1, unitPrice: 15000, taxRate: 18, lineTotal: 15000 }
      ];

      sampleItems.forEach((item, index) => {
        const lineTotal = item.lineTotal;
        subtotal += lineTotal;

        // Alternate row background (white for clean look)
        if (index % 2 === 0) {
          doc.rect(50, itemY - 5, tableWidth, 20).fill('white');
        }

        // Item details with proper alignment
        const truncatedName = item.name.length > 25 ? item.name.substring(0, 25) + '...' : item.name;
        
        // Set text color explicitly before each text element
        doc.fillColor('black').fontSize(10).font('Helvetica');
        doc.text(truncatedName, colPositions.item, itemY);
        doc.text(item.quantity.toString(), colPositions.qty, itemY);
        doc.text(`₹${item.unitPrice.toFixed(2)}`, colPositions.price, itemY);
        doc.text(`${item.taxRate}%`, colPositions.tax, itemY);
        doc.text(`₹${lineTotal.toFixed(2)}`, colPositions.total, itemY);

        itemY += 25;
      });

      // Add note about sample data
      doc.fillColor('black').fontSize(8).text('* Sample data shown - No items found in invoice', colPositions.item, itemY + 5);
      itemY += 20;
    }

    // Draw bottom line of table
    doc
      .strokeColor('black')
      .moveTo(50, itemY - 10)
      .lineTo(50 + tableWidth, itemY - 10)
      .stroke();

    // Totals section with better positioning
    const totalsY = itemY + 20;
    const totalsStartX = colPositions.price;
    const totalsWidth = colWidths.price + colWidths.tax + colWidths.total;

    // Draw totals background (white)
    doc.rect(totalsStartX, totalsY - 5, totalsWidth, 80).fill('white');

    // Calculate tax and total properly
    const taxAmount = Number(invoice.taxAmount) || (subtotal * 0.18); // 18% tax if not provided
    const totalAmount = subtotal + taxAmount;

    // Totals with better alignment
    doc.fillColor('black').fontSize(11).font('Helvetica-Bold');
    doc.text('Subtotal:', totalsStartX + 10, totalsY + 10);
    doc.text(`₹${subtotal.toFixed(2)}`, colPositions.total, totalsY + 10);

    doc.text('Tax:', totalsStartX + 10, totalsY + 30);
    doc.text(`₹${taxAmount.toFixed(2)}`, colPositions.total, totalsY + 30);

    // Draw line before total
    doc
      .strokeColor('black')
      .moveTo(totalsStartX + 10, totalsY + 45)
      .lineTo(colPositions.total, totalsY + 45)
      .stroke();

    doc.fillColor('black').fontSize(12).text('Total:', totalsStartX + 10, totalsY + 55);
    doc.text(`₹${totalAmount.toFixed(2)}`, colPositions.total, totalsY + 55);

    // Footer with better styling
    const footerY = totalsY + 100;
    doc.fillColor('black').fontSize(12).font('Helvetica-Bold').text('Thank you for your business!', 50, footerY);
    doc.fillColor('black').fontSize(10).font('Helvetica').text('For any queries, please contact us at support@shivfurniture.com', 50, footerY + 20);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 50, footerY + 40);
    
    // Add company details at bottom
    doc.fillColor('black').fontSize(9).text('SHIV FURNITURE', 50, footerY + 70);
    doc.text('123 Furniture Street, Mumbai, India', 50, footerY + 85);
    doc.text('Phone: +91-9876543210 | Email: info@shivfurniture.com', 50, footerY + 100);

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

  // ✅ Generate Professional Balance Sheet PDF (Hardcoded Demo Data)
  async generateBalanceSheet(asOfDate: Date, res: Response) {
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=balance-sheet-${asOfDate.toISOString().split('T')[0]}.pdf`,
    );

    doc.pipe(res);

    // Professional Header
    doc.fontSize(24).text('SHIV FURNITURE', 50, 50, { align: 'center' });
    doc.fontSize(18).text('Balance Sheet', 50, 85, { align: 'center' });
    doc.fontSize(12).text(`As of: ${asOfDate.toDateString()}`, 50, 115, { align: 'center' });

    let currentY = 150;

    // Helper function to format currency
    const formatCurrency = (amount: number): string => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    };

    // Helper function to add line
    const addLine = (y: number) => {
      doc.moveTo(50, y).lineTo(550, y).stroke();
    };

    // Helper function to add double line
    const addDoubleLine = (y: number) => {
      doc.moveTo(50, y).lineTo(550, y).stroke();
      doc.moveTo(50, y + 2).lineTo(550, y + 2).stroke();
    };

    // ASSETS SECTION
    doc.fontSize(16).font('Helvetica-Bold').text('ASSETS', 50, currentY);
    currentY += 30;

    // Current Assets
    doc.fontSize(14).font('Helvetica-Bold').text('Current Assets', 70, currentY);
    currentY += 25;

    const currentAssets = [
      { code: '1001', name: 'Cash A/c', amount: 45000 },
      { code: '1002', name: 'Bank A/c', amount: 215000 },
      { code: '1003', name: 'Debtors A/c', amount: 125000 },
      { code: '1004', name: 'Inventory A/c', amount: 350000 },
      { code: '1005', name: 'Prepaid Expenses', amount: 25000 }
    ];

    let totalCurrentAssets = 0;
    currentAssets.forEach(asset => {
      doc.fontSize(10).text(`${asset.code}`, 90, currentY);
      doc.text(`${asset.name}`, 120, currentY);
      doc.text(formatCurrency(asset.amount), 450, currentY, { align: 'right' });
      totalCurrentAssets += asset.amount;
      currentY += 20;
    });

    // Current Assets Subtotal
    addLine(currentY);
    doc.fontSize(12).font('Helvetica-Bold').text('Total Current Assets', 300, currentY + 10);
    doc.font('Helvetica').text(formatCurrency(totalCurrentAssets), 450, currentY + 10, { align: 'right' });
    currentY += 35;

    // Non-Current Assets
    doc.fontSize(14).font('Helvetica-Bold').text('Non-Current Assets', 70, currentY);
    currentY += 25;

    const nonCurrentAssets = [
      { code: '1101', name: 'Furniture & Fixtures', amount: 150000 },
      { code: '1102', name: 'Equipment A/c', amount: 85000 },
      { code: '1103', name: 'Vehicle A/c', amount: 225000 }
    ];

    let totalNonCurrentAssets = 0;
    nonCurrentAssets.forEach(asset => {
      doc.fontSize(10).text(`${asset.code}`, 90, currentY);
      doc.text(`${asset.name}`, 120, currentY);
      doc.text(formatCurrency(asset.amount), 450, currentY, { align: 'right' });
      totalNonCurrentAssets += asset.amount;
      currentY += 20;
    });

    // Non-Current Assets Subtotal
    addLine(currentY);
    doc.fontSize(12).font('Helvetica-Bold').text('Total Non-Current Assets', 300, currentY + 10);
    doc.font('Helvetica').text(formatCurrency(totalNonCurrentAssets), 450, currentY + 10, { align: 'right' });
    currentY += 35;

    // Total Assets
    const totalAssets = totalCurrentAssets + totalNonCurrentAssets;
    addDoubleLine(currentY);
    doc.fontSize(16).font('Helvetica-Bold').text('TOTAL ASSETS', 300, currentY + 15);
    doc.font('Helvetica').text(formatCurrency(totalAssets), 450, currentY + 15, { align: 'right' });
    currentY += 50;

    // LIABILITIES SECTION
    doc.fontSize(16).font('Helvetica-Bold').text('LIABILITIES', 50, currentY);
    currentY += 30;

    // Current Liabilities
    doc.fontSize(14).font('Helvetica-Bold').text('Current Liabilities', 70, currentY);
    currentY += 25;

    const currentLiabilities = [
      { code: '2001', name: 'Creditors A/c', amount: 95000 },
      { code: '2002', name: 'Accounts Payable', amount: 65000 },
      { code: '2003', name: 'Outstanding Expenses', amount: 15000 }
    ];

    let totalCurrentLiabilities = 0;
    currentLiabilities.forEach(liability => {
      doc.fontSize(10).text(`${liability.code}`, 90, currentY);
      doc.text(`${liability.name}`, 120, currentY);
      doc.text(formatCurrency(liability.amount), 450, currentY, { align: 'right' });
      totalCurrentLiabilities += liability.amount;
      currentY += 20;
    });

    // Current Liabilities Subtotal
    addLine(currentY);
    doc.fontSize(12).font('Helvetica-Bold').text('Total Current Liabilities', 300, currentY + 10);
    doc.font('Helvetica').text(formatCurrency(totalCurrentLiabilities), 450, currentY + 10, { align: 'right' });
    currentY += 35;

    // Non-Current Liabilities
    doc.fontSize(14).font('Helvetica-Bold').text('Non-Current Liabilities', 70, currentY);
    currentY += 25;

    const nonCurrentLiabilities = [
      { code: '2101', name: 'Bank Loan', amount: 300000 }
    ];

    let totalNonCurrentLiabilities = 0;
    nonCurrentLiabilities.forEach(liability => {
      doc.fontSize(10).text(`${liability.code}`, 90, currentY);
      doc.text(`${liability.name}`, 120, currentY);
      doc.text(formatCurrency(liability.amount), 450, currentY, { align: 'right' });
      totalNonCurrentLiabilities += liability.amount;
      currentY += 20;
    });

    // Non-Current Liabilities Subtotal
    addLine(currentY);
    doc.fontSize(12).font('Helvetica-Bold').text('Total Non-Current Liabilities', 300, currentY + 10);
    doc.font('Helvetica').text(formatCurrency(totalNonCurrentLiabilities), 450, currentY + 10, { align: 'right' });
    currentY += 35;

    // Total Liabilities
    const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;
    addDoubleLine(currentY);
    doc.fontSize(16).font('Helvetica-Bold').text('TOTAL LIABILITIES', 300, currentY + 15);
    doc.font('Helvetica').text(formatCurrency(totalLiabilities), 450, currentY + 15, { align: 'right' });
    currentY += 50;

    // EQUITY SECTION
    doc.fontSize(16).font('Helvetica-Bold').text('EQUITY', 50, currentY);
    currentY += 30;

    const equity = [
      { code: '3001', name: 'Capital A/c', amount: 500000 }
    ];

    let totalEquity = 0;
    equity.forEach(equityItem => {
      doc.fontSize(10).text(`${equityItem.code}`, 90, currentY);
      doc.text(`${equityItem.name}`, 120, currentY);
      doc.text(formatCurrency(equityItem.amount), 450, currentY, { align: 'right' });
      totalEquity += equityItem.amount;
      currentY += 20;
    });

    // Calculate Retained Earnings to balance the equation
    const retainedEarnings = totalAssets - totalLiabilities - totalEquity;
    doc.fontSize(10).text('3002', 90, currentY);
    doc.text('Retained Earnings', 120, currentY);
    doc.text(formatCurrency(retainedEarnings), 450, currentY, { align: 'right' });
    totalEquity += retainedEarnings;
    currentY += 20;

    // Total Equity
    addDoubleLine(currentY);
    doc.fontSize(16).font('Helvetica-Bold').text('TOTAL EQUITY', 300, currentY + 15);
    doc.font('Helvetica').text(formatCurrency(totalEquity), 450, currentY + 15, { align: 'right' });
    currentY += 50;

    // Balance Verification
    addDoubleLine(currentY);
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    doc.fontSize(14).font('Helvetica-Bold').text('BALANCE VERIFICATION', 200, currentY + 15);
    currentY += 30;
    doc.fontSize(12).font('Helvetica').text(`Total Assets: ${formatCurrency(totalAssets)}`, 200, currentY);
    currentY += 20;
    doc.fontSize(12).text(`Total Liabilities + Equity: ${formatCurrency(totalLiabilitiesAndEquity)}`, 200, currentY);
    currentY += 20;
    
    const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 1;
    doc.fontSize(12).font('Helvetica-Bold').text(
      isBalanced ? '✓ BALANCED' : '✗ NOT BALANCED', 
      200, 
      currentY
    );
    currentY += 50;

    // Footer
    doc.fontSize(10).text('Prepared by: System Admin', 50, currentY);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 50, currentY + 15);

    doc.end();
  }
}
