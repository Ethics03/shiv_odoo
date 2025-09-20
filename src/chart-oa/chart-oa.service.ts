import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ChartAccountFilterDto,
  CreateChartAccountDto,
  UpdateChartAccountDto,
} from './dto/chart.dto';
import { AccountType } from 'generated/prisma';

@Injectable()
export class ChartOaService {
  constructor(private readonly prisma: PrismaService) {}

  //creating account in charts of accounts
  async createAccount(payload: CreateChartAccountDto, userId: string) {
    const existingAccount = await this.prisma.chartOfAccount.findUnique({
      where: { code: payload.code },
    });

    if (existingAccount) {
      throw new BadRequestException('Account code already exists');
    }
    if (payload.parentId) {
      const parent = await this.prisma.chartOfAccount.findUnique({
        where: { id: payload.parentId, isActive: true },
      });

      if (!parent) {
        throw new BadRequestException('Parent account not found.');
      }
    }
    return this.prisma.chartOfAccount.create({
      data: {
        name: payload.name,
        code: payload.code,
        type: payload.type,
        parentId: payload.parentId,
        isActive: true,
        createdById: userId,
      },
    });
  }

  //find all the accounts with filters DTO
  async findAll(filters: ChartAccountFilterDto) {
    const where: any = {};

    if (filters.status === 'active') {
      where.isActive = true;
    } else if (filters.status === 'archived') {
      where.isActive = false;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.chartOfAccount.findMany({
      where,
      include: {
        parent: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { children: true, payments: true },
        },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  //find the one
  async findOne(id: string) {
    const account = await this.prisma.chartOfAccount.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
          select: { id: true, name: true, code: true, type: true },
        },
        payments: {
          select: {
            id: true,
            paymentNumber: true,
            amount: true,
            paymentDate: true,
            paymentMethod: true,
            contact: { select: { name: true } },
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }
  // updating this shi
  async update(id: string, updateAccountDto: UpdateChartAccountDto) {
    const existingAccount = await this.prisma.chartOfAccount.findUnique({
      where: { id },
    });

    if (!existingAccount) {
      throw new NotFoundException('Account not found');
    }

    // Validate parent if being updated
    if (updateAccountDto.parentId) {
      const parent = await this.prisma.chartOfAccount.findUnique({
        where: { id: updateAccountDto.parentId, isActive: true },
      });

      if (!parent) {
        throw new BadRequestException('Parent account not found');
      }

      // Prevent circular reference
      if (updateAccountDto.parentId === id) {
        throw new BadRequestException('Account cannot be its own parent');
      }
    }

    return this.prisma.chartOfAccount.update({
      where: { id },
      data: updateAccountDto,
    });
  }

  //get account balance
  async getAccountBalance(accountId: string) {
    const account = await this.prisma.chartOfAccount.findUnique({
      where: { id: accountId },
      select: { name: true, code: true, type: true },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const result = await this.prisma.payment.aggregate({
      where: { accountId },
      _sum: { amount: true },
    });

    return {
      account,
      balance: result._sum.amount || 0,
      balanceType: ['ASSET', 'EXPENSE'].includes(account.type)
        ? 'DEBIT'
        : 'CREDIT',
    };
  }

  //get the account by its type
  async getByType(type: AccountType) {
    return this.prisma.chartOfAccount.findMany({
      where: {
        type,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
      },
      orderBy: { code: 'asc' },
    });
  }
  //archive the account
  async archive(id: string) {
    const account = await this.prisma.chartOfAccount.findUnique({
      where: { id },
      include: {
        children: { where: { isActive: true } },
        payments: { take: 1 },
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // Check if account has active children
    if (account.children.length > 0) {
      throw new BadRequestException(
        'Cannot archive account with active sub-accounts',
      );
    }

    // Check if account has transactions
    if (account.payments.length > 0) {
      throw new BadRequestException(
        'Cannot archive account with transactions. Contact admin.',
      );
    }

    return this.prisma.chartOfAccount.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
