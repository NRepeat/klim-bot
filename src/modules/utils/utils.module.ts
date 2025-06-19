import { Module } from '@nestjs/common';
import { UtilsService } from './utils.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RatesModule } from '../rates/rates.module';
import { UserModule } from '../user/user.module';
import { VendorModule } from '../vendor/vendor.module';

@Module({
  imports: [UserModule, PrismaModule, RatesModule, VendorModule],
  providers: [UtilsService],
  exports: [UtilsService],
})
export class UtilsModule {}
