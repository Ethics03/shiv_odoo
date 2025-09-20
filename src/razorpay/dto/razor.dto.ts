import { IsNotEmpty, IsString } from '@nestjs/class-validator';

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
