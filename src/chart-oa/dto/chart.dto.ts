import {
  IsBoolean,
  IsEnum,
  IsNumber,
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

  @IsOptional()
  @IsNumber()
  openingBalance?: number;
}

export class UpdateChartAccountDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsNumber()
  openingBalance?: number;

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
