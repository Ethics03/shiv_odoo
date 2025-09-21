import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomerDashboardService {
  constructor(private prisma: PrismaService) {}

  async getCustomerMetrics(userId: string) {
    try {
      // Get customer by user ID (Contact with type CUSTOMER)
      const customer = await this.prisma.contact.findFirst({
        where: { 
          createdById: userId,
          type: 'CUSTOMER'
        },
        include: {
          customerInvoices: {
            where: {
              OR: [
                { status: 'UNPAID' },
                { status: 'OVERDUE' }
              ]
            }
          }
        }
      });

      if (!customer) {
        return {
          outstanding: 0,
          totalPurchases: 0,
          paidInvoices: 0,
          pendingInvoices: 0,
          overdueInvoices: 0
        };
      }

      // Calculate outstanding amount (unpaid + overdue invoices)
      const outstanding = customer.customerInvoices.reduce((sum, invoice) => {
        const status = invoice.status?.toUpperCase();
        if (status === 'UNPAID' || status === 'OVERDUE') {
          return sum + Number(invoice.totalAmount);
        }
        return sum;
      }, 0);

      // Get all invoices for total purchases calculation
      const allInvoices = await this.prisma.customerInvoice.findMany({
        where: { customerId: customer.id }
      });

      const totalPurchases = allInvoices.reduce((sum, invoice) => {
        return sum + Number(invoice.totalAmount);
      }, 0);

      // Count invoice statuses (normalize to uppercase)
      const paidInvoices = allInvoices.filter(inv => inv.status?.toUpperCase() === 'PAID').length;
      const pendingInvoices = allInvoices.filter(inv => inv.status?.toUpperCase() === 'UNPAID').length;
      const overdueInvoices = allInvoices.filter(inv => inv.status?.toUpperCase() === 'OVERDUE').length;

      return {
        outstanding,
        totalPurchases,
        paidInvoices,
        pendingInvoices,
        overdueInvoices
      };
    } catch (error) {
      console.error('Error getting customer metrics:', error);
      return {
        outstanding: 0,
        totalPurchases: 0,
        paidInvoices: 0,
        pendingInvoices: 0,
        overdueInvoices: 0
      };
    }
  }

  async getCustomerInvoices(userId: string) {
    try {
      // Get customer by user ID (Contact with type CUSTOMER)
      const customer = await this.prisma.contact.findFirst({
        where: { 
          createdById: userId,
          type: 'CUSTOMER'
        }
      });

      if (!customer) {
        return [];
      }

      // Get customer invoices with proper formatting
      const invoices = await this.prisma.customerInvoice.findMany({
        where: { customerId: customer.id },
        orderBy: { createdAt: 'desc' },
        take: 10 // Limit to last 10 invoices
      });

      return invoices.map(invoice => {
        // Normalize status to uppercase
        const normalizedStatus = invoice.status?.toUpperCase() || 'UNPAID'
        const isPaid = normalizedStatus === 'PAID'
        const isOverdue = normalizedStatus === 'OVERDUE'
        
        return {
          id: invoice.invoiceNumber,
          date: invoice.invoiceDate.toISOString().split('T')[0],
          dueDate: invoice.dueDate.toISOString().split('T')[0],
          status: normalizedStatus,
          amount: Number(invoice.totalAmount),
          balance: isPaid ? 0 : Number(invoice.totalAmount),
          isOverdue: isOverdue,
          daysOverdue: isOverdue ? 
            Math.max(0, Math.floor((Date.now() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24))) : 0
        }
      });
    } catch (error) {
      console.error('Error getting customer invoices:', error);
      return [];
    }
  }
}
