// ledger/ledger.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChartOfAccount, Payment } from 'generated/prisma';

@Injectable()
export class LedgerService {
  constructor(private prisma: PrismaService) {}

  //  Create Customer Invoice Ledger Entries (Fixed Types)
  async createCustomerInvoiceEntries(invoiceId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.customerInvoice.findUnique({
        where: { id: invoiceId },
        include: { customer: true },
      });

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      // Get required accounts with null checks
      const [debtorsAccount, salesAccount] = await Promise.all([
        tx.chartOfAccount.findFirst({
          where: { code: 'DEBT-001', isActive: true },
        }),
        tx.chartOfAccount.findFirst({
          where: { code: 'SALES-001', isActive: true },
        }),
      ]);

      if (!debtorsAccount) {
        throw new BadRequestException(
          'Debtors Account (DEBT-001) not found. Please create it first.',
        );
      }

      if (!salesAccount) {
        throw new BadRequestException(
          'Sales Account (SALES-001) not found. Please create it first.',
        );
      }

      const amount = Number(invoice.totalAmount);

      const payments: Payment[] = [];

      // Debit entry - Debtors Account
      const debitPayment = await tx.payment.create({
        data: {
          paymentNumber: `INV-DEBT-${Date.now()}`,
          type: 'RECEIVED',
          amount: amount,
          paymentMethod: 'BANK_TRANSFER',
          contactId: invoice.customerId,
          customerInvoiceId: invoiceId,
          accountId: debtorsAccount.id,
          status: 'pending',
          notes: `Invoice ${invoice.invoiceNumber} - ${invoice.customer.name}`,
          createdById: userId,
        },
      });

      // Credit entry - Sales Account
      const creditPayment = await tx.payment.create({
        data: {
          paymentNumber: `INV-SALES-${Date.now()}`,
          type: 'RECEIVED',
          amount: -amount, // Negative for credit
          paymentMethod: 'BANK_TRANSFER',
          contactId: invoice.customerId,
          customerInvoiceId: invoiceId,
          accountId: salesAccount.id,
          status: 'completed',
          notes: `Sales to ${invoice.customer.name} - Invoice ${invoice.invoiceNumber}`,
          createdById: userId,
        },
      });

      payments.push(debitPayment, creditPayment);

      return {
        success: true,
        data: {
          debitEntry: {
            account: `${debtorsAccount.name} (${debtorsAccount.code})`,
            amount: amount,
            type: 'DEBIT',
          },
          creditEntry: {
            account: `${salesAccount.name} (${salesAccount.code})`,
            amount: amount,
            type: 'CREDIT',
          },
        },
        payments, // Return the payments array
        message: 'Customer invoice ledger entries created successfully',
      };
    });
  }

  async createVendorBillEntries(vendorBillId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const vendorBill = await tx.vendorBill.findUnique({
        where: { id: vendorBillId },
        include: { vendor: true },
      });

      if (!vendorBill) {
        throw new NotFoundException('Vendor Bill not found');
      }

      const [bankAccount, creditorsAccount] = await Promise.all([
        tx.chartOfAccount.findFirst({
          where: { code: 'BANK-001', isActive: true },
        }),
        tx.chartOfAccount.findFirst({
          where: { code: 'CRED-001', isActive: true },
        }),
      ]);

      if (!bankAccount) {
        throw new BadRequestException(
          'Bank Account (BANK-001) not found. Please create it first.',
        );
      }

      if (!creditorsAccount) {
        throw new BadRequestException(
          'Creditors Account (CRED-001) not found. Please create it first.',
        );
      }

      const amount = Number(vendorBill.totalAmount);

      const payments: Payment[] = [];

      // Credit entry - Bank Account (money going out)
      const bankPayment = await tx.payment.create({
        data: {
          paymentNumber: `BILL-BANK-${Date.now()}`,
          type: 'PAID',
          amount: -amount, // Negative for credit
          paymentMethod: 'BANK_TRANSFER',
          contactId: vendorBill.vendorId,
          vendorBillId: vendorBillId,
          accountId: bankAccount.id,
          status: 'completed',
          notes: `Payment to ${vendorBill.vendor.name} - Bill ${vendorBill.billNumber}`,
          createdById: userId,
        },
      });

      const creditorPayment = await tx.payment.create({
        data: {
          paymentNumber: `BILL-CRED-${Date.now()}`,
          type: 'PAID',
          amount: amount, // Positive for debit
          paymentMethod: 'BANK_TRANSFER',
          contactId: vendorBill.vendorId,
          vendorBillId: vendorBillId,
          accountId: creditorsAccount.id,
          status: 'completed',
          notes: `Creditor payment ${vendorBill.vendor.name} - Bill ${vendorBill.billNumber}`,
          createdById: userId,
        },
      });

      payments.push(bankPayment, creditorPayment);

      return {
        success: true,
        data: {
          creditEntry: {
            account: `${bankAccount.name} (${bankAccount.code})`,
            amount: amount,
            type: 'CREDIT',
          },
          debitEntry: {
            account: `${creditorsAccount.name} (${creditorsAccount.code})`,
            amount: amount,
            type: 'DEBIT',
          },
        },
        payments, // Return the payments array
        message: 'Vendor bill payment processed with ledger entries',
      };
    });
  }

  // Ensure Required Accounts Exist
  async ensureRequiredAccountsExist(userId: string) {
    interface RequiredAccount {
      name: string;
      code: string;
      type: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE' | 'EQUITY';
    }

    const requiredAccounts: RequiredAccount[] = [
      { name: 'Bank A/c', code: 'BANK-001', type: 'ASSET' },
      { name: 'Debtors A/c', code: 'DEBT-001', type: 'ASSET' },
      { name: 'Creditors A/c', code: 'CRED-001', type: 'LIABILITY' },
      { name: 'Sales Income A/c', code: 'SALES-001', type: 'INCOME' },
    ];

    const missingAccounts: RequiredAccount[] = [];

    for (const account of requiredAccounts) {
      const exists = await this.prisma.chartOfAccount.findFirst({
        where: { code: account.code, isActive: true },
      });

      if (!exists) {
        missingAccounts.push(account);
      }
    }

    if (missingAccounts.length > 0) {
      // Auto-create missing accounts
      const created: ChartOfAccount[] = [];
      for (const account of missingAccounts) {
        const createdAccount = await this.prisma.chartOfAccount.create({
          data: {
            name: account.name,
            code: account.code,
            type: account.type,
            isActive: true,
            createdById: userId,
          },
        });
        created.push(createdAccount);
      }

      return {
        success: true,
        created: created.length,
        accounts: created,
        message: `Created ${created.length} missing required accounts`,
      };
    }

    return {
      success: true,
      created: 0,
      message: 'All required accounts exist',
    };
  }

  // ✅ Get Account Ledger (No changes needed - was already correct)
  async getAccountLedger(accountId: string, fromDate?: Date, toDate?: Date) {
    const account = await this.prisma.chartOfAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const where: any = { accountId };

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    const payments = await this.prisma.payment.findMany({
      where,
      include: {
        contact: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate running balance
    let runningBalance = 0;
    const ledgerEntries = payments.map((payment) => {
      runningBalance += Number(payment.amount);
      return {
        date: payment.createdAt,
        description: payment.notes,
        contactName: payment.contact?.name || 'System',
        debit: Number(payment.amount) > 0 ? Number(payment.amount) : null,
        credit:
          Number(payment.amount) < 0 ? Math.abs(Number(payment.amount)) : null,
        balance: runningBalance,
      };
    });

    return {
      success: true,
      data: {
        account: {
          name: account.name,
          code: account.code,
          type: account.type,
        },
        entries: ledgerEntries,
        finalBalance: runningBalance,
        totalEntries: ledgerEntries.length,
      },
    };
  }
}
