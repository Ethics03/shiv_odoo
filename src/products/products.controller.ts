import { Body, Controller, Get, Post, Req, Param, Put } from '@nestjs/common';
import { ProductsService } from './products.service';
import { UserRole } from '@prisma/client';
import { Roles } from 'src/auth/roles.decorator';
import { CreateProductDTO, UpdateProductDTO } from './dto/products.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productService: ProductsService) {}

  @Post('create')
  @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async create(@Body() data: CreateProductDTO, @Req() req) {
    return this.productService.createProduct(data, req.id);
  }

  @Get('dropdown')
  @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async dropdown() {
    return this.productService.dropdown();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async findProductById(@Param('id') id: string) {
    return this.productService.findProductbyId(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async updateProduct(@Param('id') id: string, @Body() data: UpdateProductDTO) {
    return this.productService.updateProduct(id, data);
  }

  @Put(':id/stock')
  @Roles(UserRole.ADMIN, UserRole.CONTACT_USER, UserRole.INVOICING_USER)
  async updateStock(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
  ) {
    return this.productService.updateStock(id, quantity);
  }
}
