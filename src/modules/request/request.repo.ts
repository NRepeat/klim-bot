import { Injectable } from '@nestjs/common';
import {
  CardRequestType,
  IbanRequestType,
  SerializedMessage,
} from 'src/types/types';
import { PrismaService } from '../prisma/prisma.service';
import { CardPaymentRequestsMethod, Status } from 'generated/prisma';

@Injectable()
export class RequestRepository {
  constructor(private readonly prisma: PrismaService) {}
  async unlinkUser(requestId: string) {
    await this.prisma.paymentRequests.update({
      where: { id: requestId },
      data: { userId: null, activeUserId: null },
    });
  }
  async updateRequestNotificationStatus(requestId: string, sended: boolean) {
    await this.prisma.paymentRequests.update({
      where: { id: requestId },
      data: { notificationSent: sended },
    });
  }
  async removeFromBlackList(id: string) {
    return this.prisma.blackList.delete({
      where: { id },
    });
  }
  async findBlackListByCardNumber(cardNumber: string) {
    return this.prisma.blackList.findFirst({
      where: { card: { some: { card: cardNumber } } },
    });
  }
  async getBlackList() {
    return this.prisma.blackList.findMany({
      include: {
        card: true,
      },
    });
  }
  async findCardPaymentByCardNumber(cardNumber: string) {
    return this.prisma.paymentRequests.findFirst({
      where: {
        cardMethods: {
          some: { card: cardNumber },
        },
      },
      include: {
        cardMethods: {
          include: {
            blackList: true,
            bank: true, // Include bank details if needed
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
  async addToBlackList(
    card: Omit<
      CardPaymentRequestsMethod,
      'id' | 'requestId' | 'createdAt' | 'updatedAt' | 'bankId'
    > & { chatId: bigint | number },
  ) {
    return this.prisma.blackList.create({
      data: {
        card: {
          create: {
            card: card.card,
            comment: card.comment,
          },
        },
      },
    });
  }
  async getAllPublicMessagesWithRequestsId(
    requestId: string,
  ): Promise<SerializedMessage[]> {
    if (!requestId) {
      throw new Error('Request ID is required');
    }
    return this.prisma.message.findMany({
      where: { requestId, accessType: 'PUBLIC' },
      orderBy: { createdAt: 'asc' },
      include: {
        paymentRequests: {
          include: {
            vendor: true,
          },
        },
      },
    });
  }
  async findAndDeleteRequestMessageByRequestId(
    requestId: string,
    messageId: number,
  ) {
    return this.prisma.message.delete({
      where: { messageId, requestId },
    });
  }
  async updateRequestStatus(
    requestId: string,
    status: Status,
    userId: string,
  ): Promise<void> {
    // console.log(
    //   `Updating request status for ID: ${requestId}, Status: ${status}, User ID: ${userId}`,
    // );
    await this.prisma.paymentRequests.update({
      where: { id: requestId },
      data: {
        status,
        payedByUser: {
          connect: { id: userId },
        },
      },
    });
  }

  async createIbanRequest(data: IbanRequestType) {
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
            nameEn: 'IBAN',
          },
        },
        ibanMethods: {
          create: {
            ...data.iban,
          },
        },
      },
      include: {
        cardMethods: {
          include: {
            blackList: true,
            bank: true, // Include bank details if needed
          },
        },
        message: true,
        vendor: true,
        rates: true,
        currency: true,
        ibanMethods: true,
        user: true,
        paymentMethod: true,
      },
    });
  }
  async getAllRequests() {
    return this.prisma.paymentRequests.findMany({
      include: {
        cardMethods: {
          include: {
            blackList: true,
            bank: true, // Include bank details if needed
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
  async acceptRequest(requestId: string, userId: string): Promise<void> {
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
        notificationSent: false,
      },
      include: {
        cardMethods: {
          include: {
            blackList: true,
            bank: true,
          },
        },
        paymentMethod: true,
        message: true,
        vendor: true,
        rates: true,
        currency: true,
        user: true,
        adminRequestPhotoMessage: true,
        ibanMethods: true,
        activeUser: true,
        payedByUser: true,
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
            bankId: data.card.bankId ? data.card.bankId : undefined,
          },
        },
      },
      include: {
        cardMethods: {
          include: {
            blackList: true,
            bank: true, // Include bank details if needed
          },
        },
        message: true,
        vendor: true,
        rates: true,
        currency: true,
        ibanMethods: true,
        paymentMethod: true,

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
      include: {
        user: true,
        paymentMethod: true,
        cardMethods: {
          include: {
            blackList: true,
            bank: true,
          },
        },
        ibanMethods: true,
        rates: true,
        vendor: true,
        message: true,
        currency: true,
        adminRequestPhotoMessage: true,
        activeUser: true,
        payedByUser: true,
      },
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
            bank: true, // Include bank details if needed
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
        cardMethods: { include: { blackList: true, bank: true } },
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
