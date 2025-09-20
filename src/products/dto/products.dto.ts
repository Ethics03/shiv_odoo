import {
  IsBoolean,
  IsDecimal,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from '@nestjs/class-validator';
import { ProductType } from 'generated/prisma';

export class CreateProductDTO {
  @IsString()
  name: string;

  @IsEnum(ProductType)
  type: ProductType;

  @IsNumber()
  salesPrice: number;

  @IsNumber()
  purchasePrice: number;

  @IsDecimal({ decimal_digits: '0,2' })
  saleTaxRate: number;

  @IsDecimal({ decimal_digits: '0,2' })
  purchaseTaxRate: number;

  @IsOptional()
  @IsString()
  hsnCode?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsInt()
  @Min(0)
  currentStock?: number;
}

export class UpdateProductDTO {
  @IsOptional()
  @IsString()
  name: string;

  @IsEnum(ProductType)
  type?: ProductType;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  salesPrice?: number;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  purchasePrice?: number;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  saleTaxRate?: number;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  purchaseTaxRate?: number;

  @IsOptional()
  @IsString()
  hsnCode?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  currentStock?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateStockDto {
  @IsInt()
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ProductFilterDto {
  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  search?: string; // Search by name or HSN code

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  lowStock?: boolean; // Products with low stock
}
