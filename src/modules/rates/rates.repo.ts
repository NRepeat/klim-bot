import { Injectable } from '@nestjs/common';
import { Repository, SerializedRate } from 'src/types/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export default class RatesRepository implements Repository<SerializedRate> {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: string) {
    return this.prisma.rates.findUnique({
      where: { id: userId },
    });
  }

  async create(data: SerializedRate) {
    return this.prisma.rates.create({
      data,
    });
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
