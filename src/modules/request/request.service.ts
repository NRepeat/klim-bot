import { Injectable } from '@nestjs/common';
import { RequestRepository } from './request.repo';
import { CardRequestType } from 'src/types/types';

@Injectable()
export class RequestService {
  constructor(private readonly requestRepo: RequestRepository) {}

  // async createRequest(data: SerializedRequest) {
  //   return this.requestRepo.create(data);
  // }
  async createCardRequest(data: CardRequestType) {
    return this.requestRepo.createCardRequest({ data });
  }
  async findAllCardRequestsByCard(cardNumber?: string) {
    return this.requestRepo.findAllCardRequestsByCard(cardNumber);
  }
  async createCardRequestMessageId(
    requestId: string,
    message: { messageId: number; chatId: number },
  ) {
    return this.requestRepo.createCardRequestMessageId(requestId, message);
  }
}
