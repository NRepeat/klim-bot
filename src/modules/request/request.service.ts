import { Injectable } from '@nestjs/common';
import { RequestRepository } from './request.repo';
import { CardRequestType, SerializedMessage } from 'src/types/types';
import { UserService } from '../user/user.service';

@Injectable()
export class RequestService {
  constructor(
    private readonly requestRepo: RequestRepository,
    private readonly userService: UserService,
  ) {}

  // async createRequest(data: SerializedRequest) {
  //   return this.requestRepo.create(data);
  // }
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
}
