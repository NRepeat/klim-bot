import { Module } from '@nestjs/common';
import { RequestService } from './request.service';
import { PrismaModule } from '../prisma/prisma.module';
import RatesRepository from '../rates/rates.repo';
import { RequestRepository } from './request.repo';
import { UserModule } from '../user/user.module';
import { VendorModule } from '../vendor/vendor.module';

@Module({
  imports: [PrismaModule, UserModule, VendorModule],
  providers: [RatesRepository, RequestService, RequestRepository],
  exports: [RatesRepository, RequestService, RequestRepository],
})
export class RequestModule {}
