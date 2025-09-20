import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from '@nestjs/class-validator';
import { OrderStatus } from 'generated/prisma';

export class PurchaseOrderItemDTO {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxRate: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice: number;
}

export class CreatePurchaseOrderDto {
  @IsString()
  vendorId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  items: PurchaseOrderItemDTO[];

  @IsOptional()
  @IsDateString()
  orderDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePurchaseOrderDto {
  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  items?: PurchaseOrderItemDTO[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePurchaseOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;
}

export class ConvertToBillDto {
  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class PurchaseOrderFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsOptional()
  @IsBoolean()
  readyForBilling?: boolean;
}
