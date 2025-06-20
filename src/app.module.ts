import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { TelegramModule } from './modules/telegram/telegram.module';
import * as LocalSession from 'telegraf-session-local';
import { RequestTaskModule } from './modules/request-task/request-task.module';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
const session = new LocalSession({});

@Module({
  imports: [
    RequestTaskModule,
    TelegramModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        middlewares: [session.middleware()],
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
          // webhook: {
          //   path: '/telegram/webhook',
          //   domain: configService.get<string>('WEBHOOK_DOMAIN') || '',
          // },
        },
      }),

      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
