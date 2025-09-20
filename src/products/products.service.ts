import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateProductDTO,
  ProductFilterDto,
  UpdateProductDTO,
} from './dto/products.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createProduct(payload: CreateProductDTO, createdById: string) {
    try {
      const existingProduct = await this.prisma.product.findFirst({
        where: {
          name: payload.name,
          isActive: true,
        },
      });

      if (existingProduct) {
        throw new BadRequestException('Product by this name already exists');
      }
      const product = await this.prisma.product.create({
        data: {
          ...payload,
          currentStock: payload.currentStock || 0,
          createdById,
        },
        include: {
          createdBy: {
            select: { name: true, email: true, role: true },
          },
        },
      });
      this.logger.log(
        `Product created: ${product.name} by user ${createdById}`,
      );

      return {
        success: true,
        data: product,
        message: 'Product created successfully',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
    }
  }

  async getAllProducts(filters?: ProductFilterDto) {
    try {
      const where: any = { isActive: true }; // Default: only active products

      // Simple filters
      if (filters?.type) where.type = filters.type;
      if (filters?.category) where.category = filters.category;
      if (filters?.search) {
        where.name = { contains: filters.search, mode: 'insensitive' };
      }

      const products = await this.prisma.product.findMany({
        where,
        orderBy: { name: 'asc' },
      });

      return {
        success: true,
        data: products,
        count: products.length,
      };
    } catch (error) {
      throw new BadRequestException('Failed to get products');
    }
  }

  async findProductbyId(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async updateProduct(id: string, data: UpdateProductDTO) {
    try {
      return await this.prisma.product.update({
        where: { id },
        data,
      });
    } catch {
      throw new NotFoundException('Product not found');
    }
  }

  async removeProduct(id: string) {
    try {
      return await this.prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
    } catch {
      throw new NotFoundException('Product not found');
    }
  }

  async updateStock(id: string, quantity: number) {
    const product = await this.findProductbyId(id);
    let newStock = product.currentStock + quantity;
    if (quantity < 0 && Math.abs(quantity) < product.currentStock) {
      newStock = product.currentStock + quantity;
    }
    if (newStock < 0) {
      throw new BadRequestException('Insufficient stock');
    }

    return this.prisma.product.update({
      where: { id },
      data: { currentStock: newStock },
    });
  }

  async dropdown() {
    return this.prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        salesPrice: true,
        saleTaxRate: true,
        currentStock: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
