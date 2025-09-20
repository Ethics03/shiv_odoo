import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from '@nestjs/class-validator';
import { ApplicableOn, ComputationMethod } from 'generated/prisma';

export class CreateTaxDTO {
  @IsString()
  name: string;

  @IsEnum(ComputationMethod)
  computationMethod: ComputationMethod;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  rate?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  fixedValues?: number;

  @IsEnum(ApplicableOn)
  applicableOn: ApplicableOn;
}

export class UpdateTaxDTO {
  @IsOptional()
  @IsString()
  name?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  rate?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  fixedValue?: number;

  @IsOptional()
  @IsEnum(ApplicableOn)
  applicableOn?: ApplicableOn;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CalculateTaxDto {
  @IsString()
  taxId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;
}
