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
        paymentMethod: {
          some: {
            cardMethods: {
              some: { card: cardNumber },
            },
          },
        },
      },
      include: {
        paymentMethod: {
          include: {
            cardMethods: { include: { blackList: true } },
            ibanMethods: true,
          },
        },
        message: true,
        vendor: true,
        rates: true,
        currency: true,
        user: true,
      },
    });
  }
  async addToBlackList(
    card: Omit<
      CardPaymentRequestsMethod,
      'id' | 'requestId' | 'createdAt' | 'updatedAt'
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
      where: { messageId },
    });
  }
  async updateRequestStatus(
    requestId: string,
    status: Status,
    userId: string,
  ): Promise<void> {
    console.log(
      `Updating request status for ID: ${requestId}, Status: ${status}, User ID: ${userId}`,
    );
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
      },
      include: {
        message: true,
        vendor: true,
        rates: true,
        currency: true,
        user: true,
        paymentMethod: {
          include: {
            ibanMethods: true,
            cardMethods: true,
          },
        },
      },
    });
  }
  async getAllRequests() {
    return this.prisma.paymentRequests.findMany({
      include: {
        paymentMethod: {
          include: {
            cardMethods: { include: { blackList: true } },
            ibanMethods: true,
          },
        },
        message: true,
        vendor: true,
        rates: true,
        currency: true,
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
        paymentMethod: {
          include: {
            cardMethods: { include: { blackList: true } },
            ibanMethods: true,
          },
        },
        message: true,
        vendor: true,
        rates: true,
        currency: true,
        user: true,
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
      },
      include: {
        paymentMethod: {
          include: {
            cardMethods: { include: { blackList: true } },
            ibanMethods: true,
          },
        },
        message: true,
        vendor: true,
        rates: true,
        currency: true,
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
        paymentMethod: {
          include: {
            cardMethods: { include: { blackList: true } },
            ibanMethods: true,
          },
        },
        rates: true,
        vendor: true,
        message: true,
        currency: true,
        activeUser: true,
        payedByUser: true,
      },
    });
  }

  async findAllCardRequestsByCard(cardNumber?: string) {
    return this.prisma.paymentRequests.findMany({
      where: {
        paymentMethod: {
          some: {
            cardMethods: {
              some: { card: cardNumber || undefined },
            },
          },
        },
      },
      include: {
        paymentMethod: {
          include: {
            cardMethods: { include: { blackList: true } },
            ibanMethods: true,
          },
        },
        message: true,
        vendor: true,
        currency: true,
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
        paymentMethod: {
          include: {
            cardMethods: { include: { blackList: true } },
            ibanMethods: true,
          },
        },
        message: true,
        vendor: true,
        rates: true,
        currency: true,
        user: true,
      },
    });
  }
}
