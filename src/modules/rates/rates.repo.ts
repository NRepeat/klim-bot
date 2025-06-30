import { Injectable } from '@nestjs/common';
import { Repository, SerializedRate } from 'src/types/types';
import { PrismaService } from '../prisma/prisma.service';
import { Currency } from 'generated/prisma';

@Injectable()
export default class RatesRepository implements Repository<SerializedRate> {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(
    minAmount: number,
    maxAmount: number,
    currencyId: string,
    paymentMethodId: string,
  ) {
    return this.prisma.rates.findFirst({
      where: {
        minAmount,
        maxAmount,
        currencyId: currencyId.toString(),
        paymentMethodId: paymentMethodId.toString(),
      },
    });
  }

  async findById(userId: string) {
    return this.prisma.rates.findUnique({
      where: { id: userId },
    });
  }

  async updateRates({
    where,
    data,
  }: {
    where: {
      id: string;
      minAmount: number;
      maxAmount: number;
      rate: number;
    };
    data: {
      minAmount?: number;
      maxAmount?: number;
      rate?: number;
      currencyId?: number;
      paymentMethodId?: number;
    };
  }) {
    try {
      await this.prisma.rates.update({
        where: {
          id: where.id,
          rate: where.rate,
          minAmount: where.minAmount,
          maxAmount: where.maxAmount,
        },
        data: {
          minAmount: data.minAmount,
          maxAmount: data.maxAmount,
          rate: data.rate,
        },
      });
    } catch (error) {
      console.error('Error updating rate:', error);
    }
  }

  async create(
    data: Omit<SerializedRate, 'id'>,
  ): Promise<SerializedRate | null> {
    try {
      if (
        !data.currencyId ||
        !data.paymentMethodId ||
        !data.maxAmount ||
        !data.minAmount ||
        !data.rate
      ) {
        throw new Error(
          'Currency, payment method, max amount, min amount, and rate are required',
        );
      }
      const createdRate = await this.prisma.rates.create({
        data: {
          maxAmount: data.maxAmount,
          minAmount: data.minAmount,
          rate: data.rate,
          currencyId: data.currencyId,
          paymentMethodId: data.paymentMethodId,
        },
      });
      return createdRate as SerializedRate;
    } catch (error) {
      console.error('Error creating rate:', error);
      throw new Error('Failed to create rate');
    }
  }

  async deleteAll() {
    const { count } = await this.prisma.rates.deleteMany({});
    return count > 0;
  }

  async update(userId: string, data: SerializedRate) {
    return this.prisma.rates.update({
      where: { id: userId },
      data,
    });
  }

  async getAll() {
    return this.prisma.rates.findMany({
      include: { currency: true, paymentMethod: true },
    });
  }
}
