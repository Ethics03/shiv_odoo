import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTaxDTO, UpdateTaxDTO } from './dto/taxes.dto';

@Injectable()
export class TaxesService {
  constructor(private prisma: PrismaService) {}
  async createTax(data: CreateTaxDTO, userId: string) {
    try {
      // First, try to create or find a system user
      let systemUser;
      try {
        systemUser = await this.prisma.user.findFirst({
          where: { loginid: 'system' },
        });

        if (!systemUser) {
          systemUser = await this.prisma.user.create({
            data: {
              email: 'system@admin.com',
              name: 'System User',
              loginid: 'system',
              role: 'ADMIN' as any,
              isActive: true,
            },
          });
        }
      } catch (error) {
        // If we can't create/find a user, use a fallback approach
        console.warn('Could not create/find system user:', error);
      }

      return this.prisma.tax.create({
        data: {
          ...data,
          createdById: systemUser?.id || 'system-user-id',
        },
      });
    } catch (error) {
      console.error('Error creating tax:', error);
      throw error;
    }
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
