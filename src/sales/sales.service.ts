import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSalesOrderDto,
  UpdateSalesOrderDto,
  UpdateSalesOrderStatusDto,
  ConvertToInvoiceDto,
  SalesOrderFilterDto,
  CreateCustomerInvoiceDto,
  UpdateCustomerInvoiceDto,
  UpdateInvoiceStatusDto,
  InvoiceFilterDto,
} from './dto/sales.dto';
import { OrderStatus, InvoiceStatus } from 'generated/prisma';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  // Sales Order Methods
  async createSalesOrder(data: CreateSalesOrderDto, userId: string) {
    const orderNumber = await this.generateOrderNumber('SO');

    // Calculate totals
    let totalAmount = 0;
    let taxAmount = 0;

    const items = await Promise.all(
      data.items.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(
            `Product with ID ${item.productId} not found`,
          );
        }

        const lineTotal =
          item.quantity * Number(item.unitPrice) * (1 + item.taxRate / 100);
        const itemTax = lineTotal - item.quantity * Number(item.unitPrice);

        totalAmount += item.quantity * Number(item.unitPrice);
        taxAmount += itemTax;

        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          lineTotal: lineTotal,
        };
      }),
    );

    const grandTotal = totalAmount + taxAmount;

    return this.prisma.salesOrder.create({
      data: {
        orderNumber,
        customerId: data.customerId,
        orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
        totalAmount: totalAmount,
        taxAmount: taxAmount,
        notes: data.notes,
        createdById: userId,
        items: {
          create: items,
        },
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findAllSalesOrders(filters: SalesOrderFilterDto = {}) {
    const where: any = {};

    if (filters.search) {
      where.OR = [
        { orderNumber: { contains: filters.search, mode: 'insensitive' } },
        {
          customer: { name: { contains: filters.search, mode: 'insensitive' } },
        },
      ];
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.readyForInvoicing) {
      where.status = OrderStatus.CONFIRMED;
      where.customerInvoices = { none: {} };
    }

    return this.prisma.salesOrder.findMany({
      where,
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
        customerInvoices: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findSalesOrderById(id: string) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
        customerInvoices: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Sales order not found');
    }

    return order;
  }

  async updateSalesOrder(id: string, data: UpdateSalesOrderDto) {
    const order = await this.findSalesOrderById(id);

    if (order.status === OrderStatus.COMPLETED) {
      throw new Error('Cannot update completed sales order');
    }

    // If items are being updated, recalculate totals
    if (data.items) {
      let totalAmount = 0;
      let taxAmount = 0;

      const items = await Promise.all(
        data.items.map(async (item) => {
          const product = await this.prisma.product.findUnique({
            where: { id: item.productId },
          });

          if (!product) {
            throw new NotFoundException(
              `Product with ID ${item.productId} not found`,
            );
          }

          const lineTotal =
            item.quantity * Number(item.unitPrice) * (1 + item.taxRate / 100);
          const itemTax = lineTotal - item.quantity * Number(item.unitPrice);

          totalAmount += item.quantity * Number(item.unitPrice);
          taxAmount += itemTax;

          return {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            lineTotal: lineTotal,
          };
        }),
      );

      const grandTotal = totalAmount + taxAmount;

      // Delete existing items and create new ones
      await this.prisma.salesOrderItem.deleteMany({
        where: { salesOrderId: id },
      });

      return this.prisma.salesOrder.update({
        where: { id },
        data: {
          ...data,
          totalAmount: totalAmount,
          taxAmount: taxAmount,
          items: {
            create: items,
          },
        },
        include: {
          customer: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    }

    return this.prisma.salesOrder.update({
      where: { id },
      data: {
        customerId: data.customerId,
        notes: data.notes,
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async updateSalesOrderStatus(id: string, data: UpdateSalesOrderStatusDto) {
    return this.prisma.salesOrder.update({
      where: { id },
      data: { status: data.status },
    });
  }

  async readyForInvoicing() {
    return this.prisma.salesOrder.findMany({
      where: {
        status: OrderStatus.CONFIRMED,
        customerInvoices: { none: {} },
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  // Customer Invoice Methods
  async createCustomerInvoice(data: CreateCustomerInvoiceDto, userId: string) {
    const invoiceNumber = await this.generateOrderNumber('INV');

    // Calculate totals
    let totalAmount = 0;
    let taxAmount = 0;

    const items = await Promise.all(
      data.items.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(
            `Product with ID ${item.productId} not found`,
          );
        }

        const lineTotal =
          item.quantity * Number(item.unitPrice) * (1 + item.taxRate / 100);
        const itemTax = lineTotal - item.quantity * Number(item.unitPrice);

        totalAmount += item.quantity * Number(item.unitPrice);
        taxAmount += itemTax;

        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          lineTotal: lineTotal,
        };
      }),
    );

    const grandTotal = totalAmount + taxAmount;

    return this.prisma.customerInvoice.create({
      data: {
        invoiceNumber,
        salesOrderId: data.salesOrderId,
        customerId: data.customerId,
        dueDate: new Date(data.dueDate),
        totalAmount: totalAmount,
        taxAmount: taxAmount,
        notes: data.notes,
        createdById: userId,
        items: {
          create: items,
        },
      },
      include: {
        customer: true,
        salesOrder: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findAllCustomerInvoices(filters: InvoiceFilterDto = {}) {
    const where: any = {};

    if (filters.search) {
      where.OR = [
        { invoiceNumber: { contains: filters.search, mode: 'insensitive' } },
        {
          customer: { name: { contains: filters.search, mode: 'insensitive' } },
        },
      ];
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.overdue) {
      where.dueDate = { lt: new Date() };
      where.status = {
        in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID],
      };
    }

    return this.prisma.customerInvoice.findMany({
      where,
      include: {
        customer: true,
        salesOrder: true,
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findCustomerInvoiceById(id: string) {
    const invoice = await this.prisma.customerInvoice.findUnique({
      where: { id },
      include: {
        customer: true,
        salesOrder: true,
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Customer invoice not found');
    }

    return invoice;
  }

  async updateCustomerInvoice(id: string, data: UpdateCustomerInvoiceDto) {
    const invoice = await this.findCustomerInvoiceById(id);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new Error('Cannot update paid invoice');
    }

    // If items are being updated, recalculate totals
    if (data.items) {
      let totalAmount = 0;
      let taxAmount = 0;

      const items = await Promise.all(
        data.items.map(async (item) => {
          const product = await this.prisma.product.findUnique({
            where: { id: item.productId },
          });

          if (!product) {
            throw new NotFoundException(
              `Product with ID ${item.productId} not found`,
            );
          }

          const lineTotal =
            item.quantity * Number(item.unitPrice) * (1 + item.taxRate / 100);
          const itemTax = lineTotal - item.quantity * Number(item.unitPrice);

          totalAmount += item.quantity * Number(item.unitPrice);
          taxAmount += itemTax;

          return {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            lineTotal: lineTotal,
          };
        }),
      );

      // Delete existing items and create new ones
      await this.prisma.customerInvoiceItem.deleteMany({
        where: { customerInvoiceId: id },
      });

      return this.prisma.customerInvoice.update({
        where: { id },
        data: {
          ...data,
          totalAmount: totalAmount,
          taxAmount: taxAmount,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          items: {
            create: items,
          },
        },
        include: {
          customer: true,
          salesOrder: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    }

    return this.prisma.customerInvoice.update({
      where: { id },
      data: {
        customerId: data.customerId,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        notes: data.notes,
      },
      include: {
        customer: true,
        salesOrder: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async updateInvoiceStatus(id: string, data: UpdateInvoiceStatusDto) {
    return this.prisma.customerInvoice.update({
      where: { id },
      data: { status: data.status },
    });
  }

  async convertSalesOrderToInvoice(
    salesOrderId: string,
    data: ConvertToInvoiceDto,
    userId: string,
  ) {
    const salesOrder = await this.findSalesOrderById(salesOrderId);

    if (salesOrder.status !== OrderStatus.CONFIRMED) {
      throw new Error(
        'Only confirmed sales orders can be converted to invoices',
      );
    }

    // Check if already converted
    const existingInvoice = await this.prisma.customerInvoice.findFirst({
      where: { salesOrderId },
    });

    if (existingInvoice) {
      throw new Error('Sales order already converted to invoice');
    }

    // Convert sales order items to invoice items
    const invoiceItems = salesOrder.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      taxRate: Number(item.taxRate),
      lineTotal: Number(item.lineTotal),
    }));

    return this.createCustomerInvoice(
      {
        customerId: salesOrder.customerId,
        salesOrderId: salesOrder.id,
        items: invoiceItems,
        dueDate: data.dueDate,
        notes: data.notes,
      },
      userId,
    );
  }

  private async generateOrderNumber(prefix: string): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const dateStr = `${year}${month}${day}`;

    // Find the last order number for today
    const lastOrder = await this.prisma.salesOrder.findFirst({
      where: {
        orderNumber: {
          startsWith: `${prefix}-${dateStr}`,
        },
      },
      orderBy: { orderNumber: 'desc' },
    });

    let sequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.orderNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    return `${prefix}-${dateStr}-${String(sequence).padStart(3, '0')}`;
  }
}
