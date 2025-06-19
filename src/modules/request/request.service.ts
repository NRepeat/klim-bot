import { Injectable } from '@nestjs/common';
import { RequestRepository } from './request.repo';
import { SerializedRequest } from 'src/types/types';

@Injectable()
export class RequestService {
  constructor(private readonly requestRepo: RequestRepository) {}

  async createRequest(data: SerializedRequest) {
    return this.requestRepo.create(data);
  }
}
