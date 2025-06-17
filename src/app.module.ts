import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { TelegramModule } from './modules/telegram/telegram.module';

@Module({
  imports: [
    TelegramModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        token: configService.get<string>('TELEGRAM_BOT_TOKEN') || '',
        launchOptions: {
          allowedUpdates: [
            'message',
            'edited_message',
            'channel_post',
            'edited_channel_post',
            'callback_query',
            'inline_query',
          ],
          webhook: {
            path: '/telegram/webhook',
            domain: configService.get<string>('WEBHOOK_DOMAIN') || '',
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
