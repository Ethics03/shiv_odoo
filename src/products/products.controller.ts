import { Body, Controller, Get, Post, Req, Param, Put, Delete, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { UserRole } from '@prisma/client';
import { Roles } from 'src/auth/roles.decorator';
import { CreateProductDTO, UpdateProductDTO, ProductFilterDto } from './dto/products.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productService: ProductsService) {}

  @Get()
  // @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async getAllProducts(@Query() filters: ProductFilterDto) {
    return this.productService.getAllProducts(filters);
  }

  @Post('create')
  // @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async create(@Body() data: CreateProductDTO, @Req() req) {
    try {
      // For testing, use a default user ID
      const userId = req.id || 'cmfs5sdfu0000ox9ezz6cjemu';
      console.log('Controller received data:', data);
      console.log('Using user ID:', userId);
      
      const result = await this.productService.createProduct(data, userId);
      console.log('Service returned:', result);
      
      return result;
    } catch (error) {
      console.error('Controller error:', error);
      throw error;
    }
  }

  @Get('dropdown')
  // @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async dropdown() {
    return this.productService.dropdown();
  }

  @Get(':id')
  // @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async findProductById(@Param('id') id: string) {
    return this.productService.findProductbyId(id);
  }

  @Put(':id')
  // @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async updateProduct(@Param('id') id: string, @Body() data: UpdateProductDTO) {
    return this.productService.updateProduct(id, data);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async deleteProduct(@Param('id') id: string) {
    return this.productService.removeProduct(id);
  }

  @Put(':id/stock')
  // @Roles(UserRole.ADMIN, UserRole.CONTACT_USER, UserRole.INVOICING_USER)
  async updateStock(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
  ) {
    return this.productService.updateStock(id, quantity);
  }
}
