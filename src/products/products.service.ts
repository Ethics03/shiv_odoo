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
      this.logger.log(`Creating product: ${payload.name} by user ${createdById}`);
      
      const existingProduct = await this.prisma.product.findFirst({
        where: {
          name: payload.name,
        },
      });

      if (existingProduct) {
        this.logger.warn(`Product already exists: ${payload.name}`);
        throw new BadRequestException('Product by this name already exists');
      }
      
      this.logger.log('Creating product in database...');
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
        `Product created successfully: ${product.name} with ID ${product.id}`,
      );

      return {
        success: true,
        data: product,
        message: 'Product created successfully',
      };
    } catch (error) {
      this.logger.error('Error creating product:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create product: ' + error.message);
    }
  }

  async getAllProducts(filters?: ProductFilterDto) {
    try {
      const where: any = {}; // No isActive filter since we're doing hard deletes

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
      this.logger.error('Error getting products:', error);
      throw new BadRequestException('Failed to get products: ' + error.message);
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
      this.logger.log(`Attempting to delete product with ID: ${id}`);
      
      // First check if the product exists
      const existingProduct = await this.prisma.product.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        this.logger.warn(`Product not found for deletion: ${id}`);
        throw new NotFoundException('Product not found');
      }

      this.logger.log(`Product found, proceeding with deletion: ${existingProduct.name}`);
      
      const result = await this.prisma.product.delete({
        where: { id },
      });
      
      this.logger.log(`Product deleted successfully: ${result.name}`);
      return result;
    } catch (error) {
      this.logger.error(`Error deleting product ${id}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      // Handle foreign key constraint errors
      if (error.code === 'P2003') {
        throw new BadRequestException('Cannot delete product: it is referenced by other records');
      }
      throw new BadRequestException('Failed to delete product: ' + error.message);
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
