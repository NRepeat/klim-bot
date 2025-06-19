import { Module } from '@nestjs/common';
import { RequestService } from './request.service';
import { PrismaModule } from '../prisma/prisma.module';
import RatesRepository from '../rates/rates.repo';
import { RequestRepository } from './request.repo';

@Module({
  imports: [PrismaModule],
  providers: [RatesRepository, RequestService, RequestRepository],
  exports: [RatesRepository, RequestService, RequestRepository],
})
export class RequestModule {}
