import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from '@nestjs/class-validator';
import { AccountType } from 'generated/prisma';

export class CreateChartAccountDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsEnum(AccountType)
  type: AccountType;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class UpdateChartAccountDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ChartAccountFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;

  @IsOptional()
  @IsString()
  status?: 'active' | 'archived' | 'pending';
}
