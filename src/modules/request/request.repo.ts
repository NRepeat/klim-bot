import { Injectable } from '@nestjs/common';
import { CardRequestType } from 'src/types/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  createCardRequest({ data }: { data: CardRequestType }) {
    return this.prisma.paymentRequests.create({
      data: {
        message: { create: { ...data.message } },
        amount: data.amount || 0,
        vendor: { connect: { id: data.vendorId } },
        rate: { connect: { id: data.rateId } },
        currency: { connect: { id: data.currencyId } },
        cardMethods: {
          create: {
            ...data.card,
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.paymentRequests.findMany();
  }

  async findOne(id: string) {
    return this.prisma.paymentRequests.findUnique({ where: { id } });
  }

  async findAllCardRequestsByCard(cardNumber?: string) {
    return this.prisma.paymentRequests.findMany({
      where: {
        cardMethods: {
          some: { card: cardNumber || undefined },
        },
      },
      include: {
        cardMethods: true,
        message: true,
        vendor: true,
        rate: true,
        currency: true,
      },
    });
  }

  // async create(data: SerializedRequest) {
  //   return this.prisma.paymentRequests.create({ data:{} });
  // }

  // async update(id: number, data: any) {
  //   return this.prisma.request.update({ where: { id }, data });
  // }

  // async delete(id: number) {
  //   return this.prisma.request.delete({ where: { id } });
  // }
}
