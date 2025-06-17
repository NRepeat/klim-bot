import { Module } from '@nestjs/common';
import RatesRepository from './rates.repo';
import { RatesService } from './rates.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [],
  providers: [RatesRepository, RatesService],
  exports: [RatesRepository, RatesService],
})
export class RatesModule {}
