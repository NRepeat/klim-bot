import { Module } from '@nestjs/common';
import { VendorService } from './vendor.service';
import { PrismaModule } from '../prisma/prisma.module';
import { VendorRepository } from './vendor.repo';

@Module({
  imports: [PrismaModule],
  providers: [VendorService, VendorRepository],
  exports: [VendorService],
})
export class VendorModule {}
