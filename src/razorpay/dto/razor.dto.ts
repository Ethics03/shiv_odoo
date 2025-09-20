import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsNumber,
  IsOptional,
} from '@nestjs/class-validator';

export class CustomerDTO {
  @IsString()
  name: string;

  @IsString()
  email: string;

  @IsString()
  contact?: string;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  invoiceId: string;
}

export class CreateMultiOrderDto {
  @IsArray()
  @IsString({ each: true })
  invoiceIds?: string[]; // Note: These are actually invoice numbers, not IDs

  @IsArray()
  @IsString({ each: true })
  billIds?: string[]; // Bill IDs for bill payments

  @IsNumber()
  @IsOptional()
  amount?: number; // User-entered payment amount
}

export class VerifyPaymentDto {
  @IsString()
  @IsNotEmpty()
  razorpay_order_id: string;

  @IsString()
  @IsNotEmpty()
  razorpay_payment_id: string;

  @IsString()
  @IsNotEmpty()
  razorpay_signature: string;
}
