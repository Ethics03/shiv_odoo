import { IsString } from '@nestjs/class-validator';

export class CustomerDTO {
  @IsString()
  name: string;

  @IsString()
  email: string;

  @IsString()
  contact?: string;
}
