import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';

@Module({
  imports: [],
  controllers: [],
  providers: [TelegramService, TelegramController],
})
export class TelegramModule {}
