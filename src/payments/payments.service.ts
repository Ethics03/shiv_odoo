import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePaymentDto,
  UpdatePaymentDto,
  PaymentFilterDto,
} from './dto/payments.dto';
import {
  PaymentType,
  PaymentMethod,
  BillStatus,
  InvoiceStatus,
  Prisma,
} from 'generated/prisma';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async createPayment(data: CreatePaymentDto, userId: string) {
    const paymentNumber = await this.generatePaymentNumber();

    // Validate that the contact exists
    const contact = await this.prisma.contact.findUnique({
      where: { id: data.contactId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    // For now, skip account validation and use a default account ID
    const accountId = 'default-cash-account';

    // Create a default account if it doesn't exist
    try {
      await this.prisma.chartOfAccount.findUniqueOrThrow({
        where: { id: accountId },
      });
    } catch {
      // Create default account
      await this.prisma.chartOfAccount.create({
        data: {
          id: accountId,
          name: 'Default Cash Account',
          code: 'CASH-DEFAULT',
          type: 'ASSET',
          isActive: true,
          createdById: userId,
        },
      });
    }

    // If it's a vendor bill payment, validate the bill
    if (data.vendorBillId) {
      const bill = await this.prisma.vendorBill.findUnique({
        where: { id: data.vendorBillId },
      });

      if (!bill) {
        throw new NotFoundException('Vendor bill not found');
      }
    }

    // If it's a customer invoice payment, validate the invoice
    if (data.customerInvoiceId) {
      const invoice = await this.prisma.customerInvoice.findUnique({
        where: { id: data.customerInvoiceId },
      });

      if (!invoice) {
        throw new NotFoundException('Customer invoice not found');
      }
    }

    const payment = await this.prisma.payment.create({
      data: {
        paymentNumber,
        type: data.type,
        amount: new Prisma.Decimal(data.amount),
        paymentDate: new Date(data.paymentDate),
        paymentMethod: data.paymentMethod,
        contactId: data.contactId,
        vendorBillId: data.vendorBillId,
        customerInvoiceId: data.customerInvoiceId,
        accountId: accountId,
        reference: data.reference,
        notes: data.notes,
        createdById: userId,
      },
      include: {
        contact: true,
        account: true,
        vendorBill: true,
        customerInvoice: true,
      },
    });

    // Update bill/invoice status if applicable
    if (data.vendorBillId) {
      await this.updateBillStatus(data.vendorBillId);
    }

    if (data.customerInvoiceId) {
      await this.updateInvoiceStatus(data.customerInvoiceId);
    }

    return payment;
  }

  async findAllPayments(filters: PaymentFilterDto = {}) {
    const where: any = {};

    if (filters.search) {
      where.OR = [
        { paymentNumber: { contains: filters.search, mode: 'insensitive' } },
        {
          contact: { name: { contains: filters.search, mode: 'insensitive' } },
        },
        { reference: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.paymentMethod) {
      where.paymentMethod = filters.paymentMethod;
    }

    if (filters.contactId) {
      where.contactId = filters.contactId;
    }

    if (filters.accountId) {
      where.accountId = filters.accountId;
    }

    return this.prisma.payment.findMany({
      where,
      include: {
        contact: true,
        account: true,
        vendorBill: true,
        customerInvoice: true,
      },
      orderBy: { paymentDate: 'desc' },
    });
  }

  async findPaymentById(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        contact: true,
        account: true,
        vendorBill: true,
        customerInvoice: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async updatePayment(id: string, data: UpdatePaymentDto) {
    const payment = await this.findPaymentById(id);

    if (payment.status === 'completed') {
      throw new Error('Cannot update completed payment');
    }

    return this.prisma.payment.update({
      where: { id },
      data: {
        ...data,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : undefined,
      },
      include: {
        contact: true,
        account: true,
        vendorBill: true,
        customerInvoice: true,
      },
    });
  }

  async deletePayment(id: string) {
    const payment = await this.findPaymentById(id);

    if (payment.status === 'completed') {
      throw new Error('Cannot delete completed payment');
    }

    // If it was a bill/invoice payment, update their status
    if (payment.vendorBillId) {
      await this.updateBillStatus(payment.vendorBillId);
    }

    if (payment.customerInvoiceId) {
      await this.updateInvoiceStatus(payment.customerInvoiceId);
    }

    return this.prisma.payment.delete({
      where: { id },
    });
  }

  async getOutstandingBills() {
    return this.prisma.vendorBill.findMany({
      where: {
        status: { in: [BillStatus.UNPAID, BillStatus.PARTIALLY_PAID] },
      },
      include: {
        vendor: true,
        purchaseOrder: true,
        payments: true,
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getOutstandingInvoices() {
    return this.prisma.customerInvoice.findMany({
      where: {
        status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID] },
      },
      include: {
        customer: true,
        salesOrder: true,
        payments: true,
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  private async updateBillStatus(billId: string) {
    const bill = await this.prisma.vendorBill.findUnique({
      where: { id: billId },
      include: { payments: true },
    });

    if (!bill) return;

    const totalPaid = bill.payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );
    const totalAmount = Number(bill.totalAmount);

    let status: BillStatus;
    if (totalPaid >= totalAmount) {
      status = BillStatus.PAID;
    } else if (totalPaid > 0) {
      status = BillStatus.PARTIALLY_PAID;
    } else {
      status = BillStatus.UNPAID;
    }

    // Check if overdue
    if (status !== BillStatus.PAID && new Date() > bill.dueDate) {
      status = BillStatus.OVERDUE;
    }

    await this.prisma.vendorBill.update({
      where: { id: billId },
      data: {
        status,
        paidAmount: totalPaid
      }
    });
  }

  private async updateInvoiceStatus(invoiceId: string) {
    const invoice = await this.prisma.customerInvoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (!invoice) return;

    const totalReceived = invoice.payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );
    const totalAmount = Number(invoice.totalAmount);

    let status: InvoiceStatus;
    if (totalReceived >= totalAmount) {
      status = InvoiceStatus.PAID;
    } else if (totalReceived > 0) {
      status = InvoiceStatus.PARTIALLY_PAID;
    } else {
      status = InvoiceStatus.UNPAID;
    }

    // Check if overdue
    if (status !== InvoiceStatus.PAID && new Date() > invoice.dueDate) {
      status = InvoiceStatus.OVERDUE;
    }

    await this.prisma.customerInvoice.update({
      where: { id: invoiceId },
      data: {
        status,
        receivedAmount: totalReceived
      }
    });
  }

  private async generatePaymentNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const dateStr = `${year}${month}${day}`;

    // Find the last payment number for today
    const lastPayment = await this.prisma.payment.findFirst({
      where: {
        paymentNumber: {
          startsWith: `PAY-${dateStr}`,
        },
      },
      orderBy: { paymentNumber: 'desc' },
    });

    let sequence = 1;
    if (lastPayment) {
      const lastSequence = parseInt(lastPayment.paymentNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    return `PAY-${dateStr}-${String(sequence).padStart(3, '0')}`;
  }
}
