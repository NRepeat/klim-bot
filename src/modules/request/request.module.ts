import { Module } from '@nestjs/common';
import { RequestService } from './request.service';
import { PrismaModule } from '../prisma/prisma.module';
import RatesRepository from '../rates/rates.repo';
import { RequestRepository } from './request.repo';
import { UserModule } from '../user/user.module';
import { VendorModule } from '../vendor/vendor.module';
import { RequestApiController } from './request.api.controller';
import { RatesModule } from '../rates/rates.module';

@Module({
  imports: [PrismaModule, UserModule, VendorModule, RatesModule],
  providers: [RatesRepository, RequestService, RequestRepository],
  exports: [RatesRepository, RequestService, RequestRepository],
  controllers: [RequestApiController],
})
export class RequestModule {}
