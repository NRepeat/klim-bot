import { Injectable } from '@nestjs/common';
import {
  GeneralRequestCreateInput,
  RequestRepository,
} from './request.repo';
import {
  CardRequestType,
  IbanRequestType,
  SerializedMessage,
} from 'src/types/types';
import { UserService } from '../user/user.service';
import { PaymentMethodEnum, Status } from '@prisma/client';

@Injectable()
export class RequestService {
  constructor(
    private readonly requestRepo: RequestRepository,
    private readonly userService: UserService,
  ) {}
  async unlinkUser(requestId: string) {
    await this.requestRepo.unlinkUser(requestId);
  }
  async findReminderMessages(requestId: string) {
    return this.requestRepo.findReminderMessages(requestId);
  }
  async saveReminderMessage(
    requestId: string,
    chatId: number,
    messageId: number,
  ) {
    return this.requestRepo.saveReminderMessage(requestId, chatId, messageId);
  }
  async deleteReminderMessages(requestId: string) {
    return this.requestRepo.deleteReminderMessages(requestId);
  }
  async updateRequestNotificationStatus(requestId: string, sended: boolean) {
    await this.requestRepo.updateRequestNotificationStatus(requestId, sended);
  }
  async getBlackList() {
    const blackList = await this.requestRepo.getBlackList();
    if (!blackList || blackList.length === 0) {
      return [];
    }
    return blackList.map((card) => ({
      card: card.cardNumber || card.card[0]?.card || '',
      comment: card.reason,
      createdAt: card.createdAt,
    }));
  }
  async findBlackListCardByCardNumber(cardNumber: string) {
    const blackListCard =
      await this.requestRepo.findBlackListByCardNumber(cardNumber);
    if (!blackListCard) {
      return null;
    }
    return blackListCard;
  }
  async removeFromBlackList(cardNumber: string) {
    await this.requestRepo.removeFromBlackList(cardNumber);
  }
  /** Запомнить квитанцию (file_id) всем карточкам заявки. */
  async setMessagesPhoto(requestId: string, photoUrl: string) {
    return this.requestRepo.setMessagesPhoto(requestId, photoUrl);
  }

  async getAllPublicMessagesWithRequestsId(
    requestId: string | undefined,
  ): Promise<SerializedMessage[]> {
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
  /** Закрытие заявки со всеми обязательными полями (площадка/курс/комиссия/ордер). */
  async completeRequestWithClose(
    requestId: string,
    userId: number,
    close: { account: string; rate: string; fee: string; orderId: string | null },
  ): Promise<void> {
    const dbUser = await this.userService.findByTelegramId(userId);
    if (!dbUser) {
      throw new Error('User not found');
    }
    await this.requestRepo.completeRequestWithClose(requestId, dbUser.id, close);
  }
  async closeFeeFor(account: string): Promise<string> {
    return this.requestRepo.closeFeeFor(account);
  }
  async getUnclosedRequestsForVendor(vendorId: string) {
    return this.requestRepo.getUnclosedRequestsForVendor(vendorId);
  }
  async acceptRequest(
    requestId: string,
    userId: number,
    chatId?: number,
  ): Promise<boolean> {
    console.log(
      `Accepting request with ID: ${requestId}, User ID: ${userId}, Chat ID: ${chatId}`,
    );
    const dbUser = await this.userService.findByTelegramId(userId);
    if (!dbUser) {
      throw new Error('User not found');
    }
    return this.requestRepo.acceptRequest(requestId, dbUser.id);
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
      const cardMethod = cardPayment.methods?.find(
        (method) =>
          method.method === PaymentMethodEnum.CARD && method.cardDetails,
      );
      const cardValue = cardMethod?.cardDetails?.card ?? cardNumber;
      return this.requestRepo.addToBlackList({
        cardNumber: cardValue,
        comment: reason || 'Card added to blacklist',
        methodId: cardMethod?.cardDetails?.id,
      });
    } else {
      return this.requestRepo.addToBlackList({
        cardNumber,
        comment: reason || 'Card added to blacklist',
      });
    }
  }
  async findById(id: string) {
    return this.requestRepo.findOne(id);
  }
  async createCardRequest(data: CardRequestType) {
    const cardNumber = data.card.card;
    const isBlackListed = await this.isInBlackList(cardNumber);
    if (isBlackListed) {
      data.blackList = isBlackListed;
      return this.requestRepo.createCardRequest({ data });
    }

    return this.requestRepo.createCardRequest({ data });
  }

  async createGeneralRequest(data: GeneralRequestCreateInput) {
    return this.requestRepo.createGeneralRequest(data);
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
    // Вызывающий передаёт ту же метку, которую потом пишет в lastReportedAt,
    // иначе между выборкой и апдейтом остаётся окно потерянных заявок.
    to: Date = new Date(),
  ) {
    return this.requestRepo.getRequestsForVendorBetween(
      vendorId,
      lastReportedAt,
      to,
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
