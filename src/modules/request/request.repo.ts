import { Injectable } from '@nestjs/common';
import { CardRequestType, SerializedMessage } from 'src/types/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getAllRequests() {
    return this.prisma.paymentRequests.findMany({
      include: {
        cardMethods: {
          include: {
            blackList: true,
          },
        },
        message: true,
        vendor: true,
        rates: true,
        currency: true,
        ibanMethods: true,
        user: true,
      },
    });
  }

  async isInBlackList(cardNumber: string) {
    return this.prisma.blackList.findFirst({
      where: { card: { some: { card: cardNumber } } },
    });
  }
  async acceptRequest(
    requestId: string,
    userId: string,
    chatId?: number,
  ): Promise<void> {
    console.log(
      `Accepting request with ID: ${requestId}, User ID: ${userId}, Chat ID: ${chatId}`,
    );
    await this.prisma.paymentRequests.update({
      where: { id: requestId },
      data: {
        status: 'ACCEPTED',
        activeUser: {
          connect: { id: userId },
        },
      },
    });
  }
  async findAllNotProcessedRequests() {
    return this.prisma.paymentRequests.findMany({
      where: {
        userId: null,
      },
      include: {
        cardMethods: {
          include: {
            blackList: true,
          },
        },
        message: true,
        vendor: true,
        rates: true,
        currency: true,
        user: true,
        adminRequestPhotoMessage: true,
        ibanMethods: true,
      },
    });
  }
  createCardRequest({ data }: { data: CardRequestType }) {
    return this.prisma.paymentRequests.create({
      data: {
        amount: data.amount || 0,
        vendor: { connect: { id: data.vendorId } },
        currency: { connect: { id: data.currencyId } },
        rates: {
          connect: { id: data.rateId },
        },
        paymentMethod: {
          connect: {
            nameEn: 'CARD',
          },
        },
        cardMethods: {
          create: {
            ...data.card,
            blackList: data.blackList
              ? {
                  connect: {
                    id: data.blackList.id,
                  },
                }
              : undefined,
          },
        },
      },
      include: {
        cardMethods: {
          include: {
            blackList: true,
          },
        },
        message: true,
        vendor: true,
        rates: true,
        currency: true,
        ibanMethods: true,
        user: true,
      },
    });
  }

  async findAll() {
    return this.prisma.paymentRequests.findMany();
  }

  async findOne(id: string) {
    return this.prisma.paymentRequests.findUnique({
      where: { id },
      include: { user: true, paymentMethod: true },
    });
  }

  async findAllCardRequestsByCard(cardNumber?: string) {
    return this.prisma.paymentRequests.findMany({
      where: {
        cardMethods: {
          some: { card: cardNumber || undefined },
        },
      },
      include: {
        cardMethods: {
          include: {
            blackList: true,
          },
        },
        message: true,
        vendor: true,
        currency: true,
        ibanMethods: true,
        user: true,
        rates: true,
      },
    });
  }
  async insertCardRequestMessage(
    requestId: string,
    message: SerializedMessage,
  ) {
    return this.prisma.paymentRequests.update({
      where: { id: requestId },
      data: {
        message: {
          create: {
            chatId: message.chatId,
            messageId: message.messageId,
            text: message.text,
            photoUrl: message.photoUrl || '',
            accessType: message.accessType,
          },
        },
      },
    });
  }
  async getRequestsForVendorBetween(vendorId: string, from: Date, to: Date) {
    return this.prisma.paymentRequests.findMany({
      where: {
        status: 'COMPLETED',
        vendorId,
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      include: {
        cardMethods: { include: { blackList: true } },
        message: true,
        vendor: true,
        rates: true,
        currency: true,
        ibanMethods: true,
        user: true,
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
