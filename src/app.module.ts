import { Module, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { TelegramModule } from './modules/telegram/telegram.module';
import * as LocalSession from 'telegraf-session-local';
import { RequestTaskModule } from './modules/request-task/request-task.module';
import { UserService } from './modules/user/user.service';
import { WorkGroupService } from './modules/telegram/work-group.service';
import { UserModule } from './modules/user/user.module';
import { ExternalApiModule } from './modules/external-api/external-api.module';
import { PayoutFieldsModule } from './modules/payout-fields/payout-fields.module';

const session = new LocalSession({});

@Module({
  imports: [
    ExternalApiModule,
    PayoutFieldsModule,
    RequestTaskModule,
    TelegramModule,
    UserModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],

      useFactory: (configService: ConfigService) => {
        const webhookDomain = configService.get<string>('WEBHOOK_DOMAIN');
        return {
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
            // Without WEBHOOK_DOMAIN fall back to long polling (local dev)
            ...(webhookDomain
              ? {
                  webhook: {
                    path: '/telegram/webhook',
                    domain: webhookDomain,
                  },
                }
              : {}),
          },
        };
      },

      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly workGroupService: WorkGroupService,
  ) {}

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async setCommandsWithRetry(
    bot: any,
    commands: { command: string; description: string }[],
    options: any,
    maxRetries = 3,
  ) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await bot.telegram.setMyCommands(commands, options);
        return;
      } catch (error: any) {
        const retryAfter = error?.response?.parameters?.retry_after;
        if (retryAfter && attempt < maxRetries - 1) {
          console.warn(
            `Rate limited by Telegram, retrying after ${retryAfter}s...`,
          );
          await this.delay(retryAfter * 1000);
        } else {
          throw error;
        }
      }
    }
  }

  async onModuleInit() {
    const { Telegraf } = await import('telegraf');
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || '';
    if (!botToken) return;
    const bot = new Telegraf(botToken);

    const DELAY_BETWEEN_CALLS = 200;

    try {
      await this.setCommandsWithRetry(
        bot,
        [
          { command: 'start', description: 'Начать работу с ботом' },
          { command: 'report', description: 'Отправить отчет' },
          { command: 'pay', description: 'Создать заказ' },
          { command: 'all_rates', description: 'Показать все курсы' },
        ],
        { scope: { type: 'default' } },
      );
    } catch (error) {
      console.error('Error setting default commands:', error);
    }

    await this.delay(DELAY_BETWEEN_CALLS);

    const admin = await this.userService.getAdmins();
    const workers = await this.userService.getWorkers();
    if (!workers || workers.length === 0) {
      console.warn('No workers found, skipping worker command registration');
    } else {
      for (const user of workers) {
        if (user.telegramId) {
          try {
            await this.setCommandsWithRetry(
              bot,
              [
                { command: 'all_rates', description: 'Показать все курсы' },
                {
                  command: 'start_work_group',
                  description: 'Начать работу в группе',
                },
              ],
              { scope: { type: 'chat', chat_id: Number(user.telegramId) } },
            );
          } catch (error) {
            console.error(
              `Error setting commands for user ${user.telegramId}:`,
              error,
            );
            continue;
          }
          await this.delay(DELAY_BETWEEN_CALLS);
        }
      }
    }
    if (!admin || !admin.users || admin.users.length === 0) {
      console.warn('No admins found, skipping admin command registration');
    } else {
      for (const user of admin.users) {
        if (user.telegramId) {
          try {
            await this.setCommandsWithRetry(
              bot,
              [
                {
                  command: 'report_all',
                  description: 'Отправить отчет всем',
                },
                { command: 'all_rates', description: 'Показать все курсы' },
                { command: 'pause', description: 'Остановить работу' },
                { command: 'resume', description: 'Запустить работу' },
                {
                  command: 'blacklist',
                  description: 'Добавить в черный список',
                },
                { command: 'on', description: 'Включить бота' },
                { command: 'off', description: 'Выключить бота' },
                {
                  command: 'remove_blacklist',
                  description: 'Удалить из черного списка',
                },
              ],
              { scope: { type: 'chat', chat_id: Number(user.telegramId) } },
            );
          } catch (error) {
            console.error(
              `Error setting commands for user ${user.telegramId}:`,
              error,
            );
            continue;
          }
          await this.delay(DELAY_BETWEEN_CALLS);
        }
      }
    }
    // меню команд вешаем на ту группу, что зарегистрирована сейчас, а не на
    // ту, что была в env при сборке образа
    const chatId = await this.workGroupService.chatId();
    if (chatId) {
      try {
        await this.setCommandsWithRetry(
          bot,
          [
            { command: 'start', description: 'Начать работу с ботом' },
            { command: 'pay', description: 'Создать заказ' },
            { command: 'all_rates', description: 'Показать все курсы' },
          ],
          { scope: { type: 'chat', chat_id: Number(chatId) } },
        );
      } catch (error) {
        console.error('Error setting group chat commands:', error);
      }
    }

    await this.delay(DELAY_BETWEEN_CALLS);
    try {
      await this.setCommandsWithRetry(
        bot,
        [
          { command: 'rateup', description: 'Обновить курсы' },
          { command: 'all_rates', description: 'Показать все курсы' },
          { command: 'chatid', description: 'Показать ID чата' },
        ],
        { scope: { type: 'chat', chat_id: -5102968943 } },
      );
    } catch (error) {
      console.error('Error setting admin group commands:', error);
    }

    console.log('Bot commands registered successfully');
  }
}
