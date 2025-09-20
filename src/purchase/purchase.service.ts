import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePurchaseOrderDto } from './dto/purchase.dto';
import { OrderStatus, Prisma } from 'generated/prisma';

@Injectable()
export class PurchaseService {
  logger = new Logger(PurchaseService.name);
  constructor(private readonly prisma: PrismaService) {}

  async create(createPurchaseOrderDto: CreatePurchaseOrderDto, userId: string) {
    // Use fallback user ID if not provided
    const actualUserId = userId || 'system-user-id';
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Ensure user exists, create system user if needed
        let systemUser = await tx.user.findUnique({
          where: { id: actualUserId }
        });
        
        if (!systemUser) {
          systemUser = await tx.user.create({
            data: {
              id: actualUserId,
              email: 'system@example.com',
              name: 'System User',
              loginid: `system-${Date.now()}`,
              role: 'ADMIN'
            }
          });
        }
        // Validate vendor exists
        const vendor = await tx.contact.findUnique({
          where: {
            id: createPurchaseOrderDto.vendorId,
            type: { in: ['VENDOR', 'BOTH'] },
          },
        });

        if (!vendor) {
          throw new BadRequestException('Valid vendor not found');
        }

        // Validate products exist and calculate totals
        let totalAmount = 0;
        let taxAmount = 0;

        for (const item of createPurchaseOrderDto.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId, isActive: true },
          });

          if (!product) {
            throw new BadRequestException(
              `Product not found: ${item.productId}`,
            );
          }

          const lineTotal = item.quantity * item.unitPrice;
          const itemTax = (lineTotal * item.taxRate) / 100;

          totalAmount += lineTotal;
          taxAmount += itemTax;
        }

        // Generate order number
        const orderNumber = `PO-${Date.now()}`;

        // Create purchase order
        const purchaseOrder = await tx.purchaseOrder.create({
          data: {
            orderNumber,
            vendorId: createPurchaseOrderDto.vendorId,
            orderDate: createPurchaseOrderDto.orderDate ? new Date(createPurchaseOrderDto.orderDate) : new Date(),
            totalAmount: new Prisma.Decimal(totalAmount),
            taxAmount: new Prisma.Decimal(taxAmount),
            status: 'DRAFT',
            notes: createPurchaseOrderDto.notes,
            createdById: actualUserId,
          },
        });

        // Create order items
        for (const item of createPurchaseOrderDto.items) {
          const lineTotal = item.quantity * item.unitPrice;
          await tx.purchaseOrderItem.create({
            data: {
              purchaseOrderId: purchaseOrder.id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: new Prisma.Decimal(item.unitPrice),
              taxRate: new Prisma.Decimal(item.taxRate),
              lineTotal: new Prisma.Decimal(lineTotal),
            },
          });
        }

        this.logger.log(
          `Purchase Order created: ${orderNumber} by user ${userId}`,
        );

        return {
          success: true,
          data: await tx.purchaseOrder.findUnique({
            where: { id: purchaseOrder.id },
            include: {
              vendor: { select: { name: true, email: true } },
              items: { include: { product: { select: { name: true } } } },
            },
          }),
          message: 'Purchase Order created successfully',
        };
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to create purchase order: ${error.message}`);
      throw new BadRequestException(
        `Failed to create purchase order: ${error.message}`,
      );
    }
  }

  //getting all the purchase orders
  async findAll(search?: string) {
    const where: any = {};

    if (search) {
      where.orderNumber = { contains: search, mode: 'insensitive' };
    }

    return this.prisma.purchaseOrder.findMany({
      where,
      include: {
        vendor: { select: { name: true, email: true } },
        items: { include: { product: { select: { name: true } } } },
        _count: { select: { vendorBills: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  //getting purchase order by id
  async findOne(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        items: { include: { product: true } },
        vendorBills: {
          select: { id: true, billNumber: true, status: true },
        },
      },
    });

    if (!po) {
      throw new NotFoundException('Purchase Order not found');
    }

    return po;
  }

  //updating status
  async updateStatus(id: string, status: OrderStatus) {
    try {
      return await this.prisma.purchaseOrder.update({
        where: { id },
        data: { status },
      });
    } catch {
      throw new NotFoundException('Purchase Order not found');
    }
  }

  async convertToBill(poId: string, billData: any, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id: poId },
        include: { items: { include: { product: true } } },
      });

      if (!po) {
        throw new NotFoundException('Purchase Order not found');
      }

      if (po.status !== 'CONFIRMED') {
        throw new BadRequestException('PO must be confirmed first');
      }

      // Create vendor bill
      const bill = await tx.vendorBill.create({
        data: {
          billNumber: `BILL-${Date.now()}`,
          purchaseOrderId: po.id,
          vendorId: po.vendorId,
          invoiceDate: billData.invoiceDate ? new Date(billData.invoiceDate) : new Date(),
          dueDate: new Date(billData.dueDate),
          totalAmount: po.totalAmount,
          taxAmount: po.taxAmount,
          paidAmount: new Prisma.Decimal(0),
          status: 'UNPAID',
          notes: billData.notes || `From PO: ${po.orderNumber}`,
          createdById: userId,
        },
      });

      // Copy items and update stock
      for (const item of po.items) {
        await tx.vendorBillItem.create({
          data: {
            vendorBillId: bill.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            lineTotal: item.lineTotal,
          },
        });

        // Update stock for goods
        if (item.product.type === 'GOODS') {
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { increment: item.quantity } },
          });
        }
      }

      // Mark PO as completed
      await tx.purchaseOrder.update({
        where: { id: poId },
        data: { status: 'COMPLETED' },
      });

      return bill;
    });
  }
  //read
  async readyForBilling() {
    return this.prisma.purchaseOrder.findMany({
      where: {
        status: 'CONFIRMED',
        vendorBills: { none: {} },
      },
      include: {
        vendor: { select: { name: true } },
        items: { include: { product: { select: { name: true } } } },
      },
    });
  }
  //removing the PO
  async remove(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!po) {
      throw new NotFoundException('Purchase Order not found');
    }

    if (po.status !== 'DRAFT') {
      throw new BadRequestException('Can only delete draft POs');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
      await tx.purchaseOrder.delete({ where: { id } });
    });
  }
}
