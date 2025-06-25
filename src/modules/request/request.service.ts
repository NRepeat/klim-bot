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

  async getAllPublicMessagesWithRequestsId(
    requestId: string | undefined,
  ): Promise<SerializedMessage[]> {
    console.log(`Fetching all public messages with request ID: ${requestId}`);
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
    console.log(
      `Updating request status for ID: ${requestId}, Status: ${status}, User ID: ${userId}`,
    );
    const dbUser = await this.userService.findByTelegramId(userId);
    console.log(`Found user: ${dbUser?.username} with ID: ${dbUser?.id}`);
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
    await this.requestRepo.acceptRequest(requestId, dbUser.id, chatId);
  }
  async isInBlackList(cardNumber: string) {
    const isBlackListed = this.requestRepo.isInBlackList(cardNumber);
    return isBlackListed;
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
