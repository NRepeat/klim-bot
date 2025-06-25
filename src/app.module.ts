import { Module, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { TelegramModule } from './modules/telegram/telegram.module';
import * as LocalSession from 'telegraf-session-local';
import { RequestTaskModule } from './modules/request-task/request-task.module';

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
export class AppModule implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    // Регистрация команд Telegram
    const { Telegraf } = await import('telegraf');
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || '';
    if (!botToken) return;
    const bot = new Telegraf(botToken);
    await bot.telegram.setMyCommands([
      { command: 'start', description: 'Начать работу с ботом' },
      { command: 'help', description: 'Помощь' },
      // Добавьте свои команды ниже
      // { command: 'profile', description: 'Профиль' },
    ]);
  }
}
