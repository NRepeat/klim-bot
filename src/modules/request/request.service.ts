import { Injectable } from '@nestjs/common';
import { RequestRepository } from './request.repo';
import { CardRequestType, SerializedMessage } from 'src/types/types';

@Injectable()
export class RequestService {
  constructor(private readonly requestRepo: RequestRepository) {}

  // async createRequest(data: SerializedRequest) {
  //   return this.requestRepo.create(data);
  // }
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
