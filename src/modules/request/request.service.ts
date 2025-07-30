import { Injectable } from '@nestjs/common';
import { RequestRepository } from './request.repo';
import {
  CardRequestType,
  IbanRequestType,
  SerializedMessage,
} from 'src/types/types';
import { UserService } from '../user/user.service';
import { VendorService } from '../vendor/vendor.service';
import { Status } from 'generated/prisma';

@Injectable()
export class RequestService {
  constructor(
    private readonly requestRepo: RequestRepository,
    private readonly userService: UserService,
    private readonly vendorService: VendorService,
  ) {}
  async unlinkUser(requestId: string) {
    await this.requestRepo.unlinkUser(requestId);
  }
  async updateRequestNotificationStatus(requestId: string, sended: boolean) {
    await this.requestRepo.updateRequestNotificationStatus(requestId, sended);
  }
  async getBlackList() {
    // console.log('Fetching blacklist');
    const blackList = await this.requestRepo.getBlackList();
    if (!blackList || blackList.length === 0) {
      // console.log('Blacklist is empty');
      return [];
    }
    // console.log(`Found ${blackList.length} cards in blacklist`);
    return blackList.map((card) => ({
      card: card.card[0].card,
      comment: card.reason,
      createdAt: card.createdAt,
    }));
  }
  async findBlackListCardByCardNumber(cardNumber: string) {
    // console.log(`Finding blacklist card by number: ${cardNumber}`);
    const blackListCard =
      await this.requestRepo.findBlackListByCardNumber(cardNumber);
    if (!blackListCard) {
      return null;
    }
    return blackListCard;
  }
  async removeFromBlackList(cardNumber: string) {
    // console.log(`Removing card ${cardNumber} from blacklist`);
    await this.requestRepo.removeFromBlackList(cardNumber);
  }
  async getAllPublicMessagesWithRequestsId(
    requestId: string | undefined,
  ): Promise<SerializedMessage[]> {
    // console.log(`Fetching all public messages with request ID: ${requestId}`);
    if (!requestId) {
      throw new Error('Request ID is required');
    }
    const messages =
      await this.requestRepo.getAllPublicMessagesWithRequestsId(requestId);
    return messages;
  }

  async findAndDeleteRequestMessageByRequestId(
    requestId: string,
    messageId: number,
  ) {
    await this.requestRepo.findAndDeleteRequestMessageByRequestId(
      requestId,
      messageId,
    );
  }
  async updateRequestStatus(
    requestId: string,
    status: Status,
    userId: number,
  ): Promise<void> {
    const dbUser = await this.userService.findByTelegramId(userId);
    if (!dbUser) {
      throw new Error('User not found');
    }
    await this.requestRepo.updateRequestStatus(requestId, status, dbUser.id);
  }
  async acceptRequest(
    requestId: string,
    userId: number,
    chatId?: number,
  ): Promise<void> {
    console.log(
      `Accepting request with ID: ${requestId}, User ID: ${userId}, Chat ID: ${chatId}`,
    );
    const dbUser = await this.userService.findByTelegramId(userId);
    if (!dbUser) {
      throw new Error('User not found');
    }
    await this.requestRepo.acceptRequest(requestId, dbUser.id);
  }
  async isInBlackList(cardNumber: string) {
    const isBlackListed = this.requestRepo.isInBlackList(cardNumber);
    return isBlackListed;
  }
  async addToBlackList(cardNumber: string, reason?: string) {
    const isBlackListed = await this.isInBlackList(cardNumber);
    if (isBlackListed) {
      throw new Error(`Card ${cardNumber} is already in the blacklist`);
    }
    const cardPayment =
      await this.requestRepo.findCardPaymentByCardNumber(cardNumber);
    if (cardPayment) {
      return this.requestRepo.addToBlackList({
        card: cardPayment.cardMethods[0].card,
        chatId: 0,
        comment: reason || 'Card added to blacklist',
      });
    } else {
      return this.requestRepo.addToBlackList({
        card: cardNumber,
        chatId: 0,
        comment: reason || 'Card added to blacklist',
      });
    }
  }
  async findById(id: string) {
    return this.requestRepo.findOne(id);
  }
  async createCardRequest(data: CardRequestType) {
    const cardNumber = data.card?.card;
    const isBlackListed = await this.isInBlackList(cardNumber);
    if (isBlackListed) {
      data.blackList = isBlackListed;
      return this.requestRepo.createCardRequest({ data });
    }

    return this.requestRepo.createCardRequest({ data });
  }
  async findAllCardRequestsByCard(cardNumber?: string) {
    return this.requestRepo.findAllCardRequestsByCard(cardNumber);
  }
  async insertCardRequestMessage(
    requestId: string,
    message: SerializedMessage,
  ) {
    return this.requestRepo.insertCardRequestMessage(requestId, message);
  }

  async findAllNotProcessedRequests() {
    return this.requestRepo.findAllNotProcessedRequests();
  }
  async getAllRequests() {
    return this.requestRepo.getAllRequests();
  }
  async getRequestsForVendorSinceLastReport(
    vendorId: string,
    lastReportedAt: Date,
  ) {
    const now = new Date();
    return this.requestRepo.getRequestsForVendorBetween(
      vendorId,
      lastReportedAt,
      now,
    );
  }

  async createIbanRequest(data: IbanRequestType) {
    try {
      return this.requestRepo.createIbanRequest(data);
    } catch (error) {
      throw new Error(
        `Failed to create IBAN request: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }
}
