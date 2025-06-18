import { Module } from '@nestjs/common';
import RatesRepository from './rates.repo';
import { RatesService } from './rates.service';
import { PrismaModule } from '../prisma/prisma.module';
import { VendorModule } from '../vendor/vendor.module';

@Module({
  imports: [PrismaModule, VendorModule],
  controllers: [],
  providers: [RatesRepository, RatesService],
  exports: [RatesRepository, RatesService],
})
export class RatesModule {}
