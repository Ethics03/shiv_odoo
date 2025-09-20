import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTaxDTO, UpdateTaxDTO } from './dto/taxes.dto';
import { NotFoundError } from 'rxjs';

@Injectable()
export class TaxesService {
  constructor(private prisma: PrismaService) {}
  async createTax(data: CreateTaxDTO, userId: string) {
    return this.prisma.tax.create({
      data: { ...data, createdById: userId },
    });
  }

  async findAll(search?: string) {
    const where: any = { isActive: true };

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    return this.prisma.tax.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findTaxbyId(id: string) {
    const tax = await this.prisma.tax.findUnique({
      where: { id: id },
    });

    if (!tax) {
      throw new NotFoundException('Tax not found!');
    }
    return tax;
  }

  async updateTax(id: string, data: UpdateTaxDTO) {
    try {
      return await this.prisma.tax.update({
        where: { id },
        data,
      });
    } catch {
      throw new NotFoundException('Tax not found!');
    }
  }

  async removeTax(id: string) {
    try {
      return await this.prisma.tax.delete({
        where: { id },
      });
    } catch {
      throw new NotFoundException('Tax not found');
    }
  }
}
