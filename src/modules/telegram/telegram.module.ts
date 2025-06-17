import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { UserModule } from '../user/user.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [UserModule, PrismaModule],
  controllers: [],
  providers: [TelegramService, TelegramController],
})
export class TelegramModule {}
